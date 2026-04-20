import tls from "node:tls";
import type { AuditCheck } from "@/types/audit";

// Detect HTTP/2 via TLS ALPN negotiation, and HTTP/3 via the Alt-Svc header
// returned on a regular HTTPS request. ALPN is the authoritative way to know
// what the server *supports* beyond what the browser ends up using.

async function negotiateAlpn(hostname: string, port: number, protocols: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (v: string | null) => {
      if (resolved) return;
      resolved = true;
      try {
        socket.destroy();
      } catch {}
      resolve(v);
    };
    const socket = tls.connect({
      host: hostname,
      port,
      servername: hostname,
      ALPNProtocols: protocols,
      rejectUnauthorized: false,
    });
    const timer = setTimeout(() => finish(null), 6000);
    socket.once("secureConnect", () => {
      clearTimeout(timer);
      finish(socket.alpnProtocol || null);
    });
    socket.once("error", () => {
      clearTimeout(timer);
      finish(null);
    });
  });
}

async function fetchAltSvc(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      method: "HEAD",
      redirect: "follow",
    });
    clearTimeout(timer);
    return res.headers.get("alt-svc");
  } catch {
    return null;
  }
}

export async function checkHttpProtocols(targetUrl: string): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return checks;
  }
  if (parsed.protocol !== "https:") return checks;

  const port = parsed.port ? parseInt(parsed.port) : 443;

  // HTTP/2 — advertise ["h2", "http/1.1"]; server picks h2 if supported
  const alpn = await negotiateAlpn(parsed.hostname, port, ["h2", "http/1.1"]);
  const supportsH2 = alpn === "h2";

  checks.push({
    id: "http2-support",
    category: "infra",
    name: "Support HTTP/2",
    status: supportsH2 ? "pass" : "info",
    description: supportsH2
      ? "Le serveur négocie HTTP/2 via ALPN — gains de latence et multiplexing activés."
      : `Le serveur négocie ${alpn ?? "HTTP/1.1"}. HTTP/2 apporte du multiplexing et une meilleure performance TLS.`,
    value: alpn ?? "http/1.1",
    recommendation: !supportsH2
      ? "Activez HTTP/2 dans votre serveur web (Nginx: listen 443 ssl http2; Apache: Protocols h2 http/1.1)."
      : undefined,
  });

  // HTTP/3 — advertised via Alt-Svc header (RFC 7838) on a regular GET
  const altSvc = await fetchAltSvc(targetUrl);
  const supportsH3 =
    !!altSvc && (/\bh3\b|\bh3-[0-9]{2}\b/.test(altSvc) || /\bquic\b/i.test(altSvc));

  checks.push({
    id: "http3-support",
    category: "infra",
    name: "Support HTTP/3 (QUIC)",
    status: supportsH3 ? "pass" : "info",
    description: supportsH3
      ? `Le serveur annonce HTTP/3 via Alt-Svc. Connexions plus rapides et resilientes aux coupures réseau.`
      : "HTTP/3 n'est pas annoncé. Recommandé pour les sites à forte audience mobile (gains de latence sur 3G/4G).",
    value: altSvc ?? undefined,
    recommendation: !supportsH3
      ? "Activez HTTP/3 (Cloudflare : toggle dans le dashboard. Nginx : compiler avec quic module. Caddy : activé par défaut)."
      : undefined,
  });

  return checks;
}
