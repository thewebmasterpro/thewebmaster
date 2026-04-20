import { NextRequest, NextResponse } from "next/server";
import tls from "node:tls";
import { insertAuditRequest, insertAuditReport, getPreviousAudit } from "@/lib/db";
import type {
  AuditCheck,
  CategoryScore,
  CMSInfo,
  AuditResult,
  Regression,
} from "@/types/audit";
import { detectStack, buildThreatModel } from "@/lib/audit/stack";
import { enrichWithCompliance } from "@/lib/audit/compliance";
import { enhanceWithStackRemediations } from "@/lib/audit/remediations";
import { buildActionPlan } from "@/lib/audit/action-plan";
import { discoverRoutes, crawlAndAuditHeaders } from "@/lib/audit/crawl";
import { preloadLatestVersions } from "@/lib/audit/live-versions";
import { checkCAA } from "@/lib/audit/dns-caa";
import { checkHttpProtocols } from "@/lib/audit/http2-http3";
import { analyzeCSP } from "@/lib/audit/csp-analyzer";
import { checkSubdomainTakeover } from "@/lib/audit/subdomain-takeover";

// =============================================================================
// SECURITY AUDIT API — Full Expert Analysis
// OWASP, Infrastructure, RGPD Compliance, Incident Response
// =============================================================================

// Helper: safe fetch with timeout
async function safeFetch(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 5000);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch {
    return null;
  }
}

// =============================================================================
// INFRASTRUCTURE CONTEXT — detect CDN / hosting so checks can be contextualised
// =============================================================================

interface InfraContext {
  cdn: string | null;
  isManagedHost: boolean;
}

function detectInfra(headers: Headers): InfraContext {
  const server = (headers.get("server") || "").toLowerCase();
  const via = (headers.get("via") || "").toLowerCase();
  const xServedBy = (headers.get("x-served-by") || "").toLowerCase();

  let cdn: string | null = null;
  if (headers.get("cf-ray") || headers.get("cf-cache-status") || server.includes("cloudflare")) {
    cdn = "Cloudflare";
  } else if (headers.get("x-vercel-id") || headers.get("x-vercel-cache") || server.includes("vercel")) {
    cdn = "Vercel";
  } else if (headers.get("x-nf-request-id") || server.includes("netlify")) {
    cdn = "Netlify";
  } else if (headers.get("x-amz-cf-id") || via.includes("cloudfront")) {
    cdn = "CloudFront";
  } else if (xServedBy.includes("fastly") || via.includes("fastly") || headers.get("fastly-debug-digest")) {
    cdn = "Fastly";
  } else if (headers.get("x-github-request-id")) {
    cdn = "GitHub Pages";
  } else if (server.includes("render")) {
    cdn = "Render";
  }

  return { cdn, isManagedHost: cdn !== null };
}

// =============================================================================
// SOFT 404 DETECTOR — robust catch-all detection with two probes + normalisation
// =============================================================================

interface Soft404Detector {
  enabled: boolean;
  isSoft404: (body: string, status: number) => boolean;
}

function normaliseForFingerprint(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\d{8,}/g, "N") // timestamps, long numbers
    .replace(/[a-f0-9]{16,}/gi, "H") // hashes / IDs
    .replace(/\s+/g, " ")
    .trim();
}

function structuralSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const len = Math.min(a.length, b.length);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  if (len / maxLen < 0.6) return 0; // very different lengths
  let matches = 0;
  for (let i = 0; i < len; i++) if (a[i] === b[i]) matches++;
  return matches / maxLen;
}

async function createSoft404Detector(origin: string): Promise<Soft404Detector> {
  const probe = async () => {
    const res = await safeFetch(
      `${origin}/__nonexistent_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      { method: "GET", redirect: "manual", timeout: 4000 }
    );
    if (!res || res.status !== 200) return null;
    try {
      return await res.text();
    } catch {
      return null;
    }
  };

  const [body1, body2] = await Promise.all([probe(), probe()]);
  if (!body1 || !body2) return { enabled: false, isSoft404: () => false };

  const fp1 = normaliseForFingerprint(body1).substring(0, 3000);
  const fp2 = normaliseForFingerprint(body2).substring(0, 3000);

  // Both probes must be structurally similar (catch-all returns same shell)
  if (structuralSimilarity(fp1, fp2) < 0.85) {
    return { enabled: false, isSoft404: () => false };
  }

  return {
    enabled: true,
    isSoft404: (body: string, status: number) => {
      if (status !== 200) return false;
      const nb = normaliseForFingerprint(body).substring(0, 3000);
      return structuralSimilarity(nb, fp1) > 0.85 || structuralSimilarity(nb, fp2) > 0.85;
    },
  };
}

// =============================================================================
// HTML ANALYSIS HELPERS — strip scripts/styles/comments before code heuristics
// =============================================================================

function stripScriptsStylesComments(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

function extractScriptContent(html: string): string {
  const matches = html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi) || [];
  return matches.map((m) => m.replace(/<script[^>]*>|<\/script>/gi, "")).join("\n");
}

// =============================================================================
// 1. SSL / TLS CHECKS
// =============================================================================

async function checkSSL(targetUrl: string, isHttps: boolean): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];

  checks.push({
    id: "ssl",
    category: "ssl",
    name: "Connexion HTTPS/SSL",
    status: isHttps ? "pass" : "fail",
    severity: isHttps ? undefined : "critical",
    description: isHttps
      ? "Le site utilise une connexion HTTPS sécurisée."
      : "Le site n'utilise pas HTTPS. Toutes les données transitent en clair.",
    recommendation: !isHttps
      ? "Installez un certificat SSL (Let's Encrypt gratuit) et redirigez tout le trafic vers HTTPS."
      : undefined,
  });

  // HTTP → HTTPS redirect
  if (isHttps) {
    try {
      const httpUrl = targetUrl.replace("https://", "http://");
      const httpRes = await safeFetch(httpUrl, { method: "HEAD", redirect: "manual" });
      if (httpRes) {
        const redirectsToHttps =
          httpRes.status >= 300 &&
          httpRes.status < 400 &&
          httpRes.headers.get("location")?.startsWith("https://");

        checks.push({
          id: "http-redirect",
          category: "ssl",
          name: "Redirection HTTP → HTTPS",
          status: redirectsToHttps ? "pass" : "warn",
          severity: !redirectsToHttps ? "medium" : undefined,
          description: redirectsToHttps
            ? "Le trafic HTTP est automatiquement redirigé vers HTTPS."
            : "Le site ne redirige pas automatiquement HTTP vers HTTPS.",
          recommendation: !redirectsToHttps
            ? "Configurez une redirection 301 permanente de HTTP vers HTTPS."
            : undefined,
        });
      }
    } catch {
      // Can't check
    }
  }

  return checks;
}

// =============================================================================
// 1b. TLS DETAILS — protocol version, cipher, certificate expiration
// =============================================================================

interface TlsDetails {
  protocol: string | null;
  cipher: { name: string; standardName?: string; version?: string } | null;
  validFrom: Date | null;
  validTo: Date | null;
  issuer: string | null;
  subject: string | null;
}

async function fetchTlsDetails(hostname: string, port = 443): Promise<TlsDetails | null> {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (value: TlsDetails | null) => {
      if (resolved) return;
      resolved = true;
      try {
        socket.destroy();
      } catch {}
      resolve(value);
    };
    const socket = tls.connect({
      host: hostname,
      port,
      servername: hostname,
      rejectUnauthorized: false,
    });
    const timer = setTimeout(() => finish(null), 8000);
    socket.once("secureConnect", () => {
      clearTimeout(timer);
      try {
        const protocol = socket.getProtocol();
        const cipher = socket.getCipher();
        const cert = socket.getPeerCertificate();
        finish({
          protocol,
          cipher: cipher ? { name: cipher.name, standardName: (cipher as { standardName?: string }).standardName, version: cipher.version } : null,
          validFrom: cert?.valid_from ? new Date(cert.valid_from) : null,
          validTo: cert?.valid_to ? new Date(cert.valid_to) : null,
          issuer: cert?.issuer ? (cert.issuer.O || cert.issuer.CN || null) : null,
          subject: cert?.subject ? (cert.subject.CN || null) : null,
        });
      } catch {
        finish(null);
      }
    });
    socket.once("error", () => {
      clearTimeout(timer);
      finish(null);
    });
  });
}

async function checkTLS(targetUrl: string): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return checks;
  }
  if (parsed.protocol !== "https:") return checks;

  const port = parsed.port ? parseInt(parsed.port) : 443;
  const details = await fetchTlsDetails(parsed.hostname, port);
  if (!details) return checks;

  // Protocol version
  if (details.protocol) {
    const p = details.protocol;
    const isOld = p === "TLSv1" || p === "TLSv1.1" || p === "SSLv3";
    const isAcceptable = p === "TLSv1.2";
    const isModern = p === "TLSv1.3";
    checks.push({
      id: "tls-protocol",
      category: "ssl",
      name: "Version TLS négociée",
      status: isModern ? "pass" : isAcceptable ? "warn" : isOld ? "fail" : "info",
      severity: isOld ? "high" : isAcceptable ? "low" : undefined,
      description: isModern
        ? `Le serveur négocie ${p} — version moderne.`
        : isAcceptable
        ? `Le serveur négocie ${p}. Fonctionnel, mais TLS 1.3 est recommandé.`
        : isOld
        ? `Le serveur négocie une version obsolète (${p}). Dépréciée et vulnérable.`
        : `Protocole négocié : ${p}.`,
      value: p,
      recommendation: isOld
        ? "Désactivez TLS 1.0/1.1 et activez TLS 1.3 dans votre configuration serveur."
        : isAcceptable
        ? "Activez TLS 1.3 pour de meilleures performances et sécurité."
        : undefined,
    });
  }

  // Cipher
  if (details.cipher) {
    const name = (details.cipher.standardName || details.cipher.name || "").toUpperCase();
    const weak =
      name.includes("RC4") ||
      name.includes("3DES") ||
      name.includes("_DES_") ||
      name.includes("NULL") ||
      name.includes("EXPORT") ||
      name.includes("MD5");
    checks.push({
      id: "tls-cipher",
      category: "ssl",
      name: "Cipher TLS",
      status: weak ? "fail" : "pass",
      severity: weak ? "high" : undefined,
      description: weak ? `Cipher faible négocié : ${name}.` : `Cipher négocié : ${name}.`,
      value: name,
      recommendation: weak ? "Désactivez les ciphers faibles dans votre configuration TLS." : undefined,
    });
  }

  // Certificate expiration
  if (details.validTo) {
    const msToExpiry = details.validTo.getTime() - Date.now();
    const daysToExpiry = Math.floor(msToExpiry / 86400000);
    let status: "pass" | "warn" | "fail" = "pass";
    let severity: "critical" | "high" | "medium" | "low" | undefined;
    let description: string;
    if (daysToExpiry < 0) {
      status = "fail";
      severity = "critical";
      description = `Le certificat SSL est expiré depuis ${Math.abs(daysToExpiry)} jour(s).`;
    } else if (daysToExpiry < 14) {
      status = "fail";
      severity = "high";
      description = `Le certificat SSL expire dans ${daysToExpiry} jour(s).`;
    } else if (daysToExpiry < 30) {
      status = "warn";
      severity = "medium";
      description = `Le certificat SSL expire dans ${daysToExpiry} jour(s). Planifiez le renouvellement.`;
    } else {
      description = `Certificat valide jusqu'au ${details.validTo.toISOString().split("T")[0]} (${daysToExpiry} jour(s) restants).`;
    }
    checks.push({
      id: "tls-cert-expiry",
      category: "ssl",
      name: "Expiration du certificat SSL",
      status,
      severity,
      description,
      value: details.validTo.toISOString().split("T")[0],
      recommendation:
        daysToExpiry < 30
          ? "Renouvelez le certificat rapidement. Automatisez avec certbot/Let's Encrypt."
          : undefined,
    });
  }

  if (details.issuer) {
    checks.push({
      id: "tls-issuer",
      category: "ssl",
      name: "Émetteur du certificat",
      status: "info",
      description: `Certificat émis par : ${details.issuer}.`,
      value: details.issuer,
    });
  }

  return checks;
}

// =============================================================================
// 2. SECURITY HEADERS (OWASP)
// =============================================================================

function checkSecurityHeaders(headers: Headers, infra: InfraContext): AuditCheck[] {
  const checks: AuditCheck[] = [];

  // HSTS
  const hsts = headers.get("strict-transport-security");
  if (!hsts) {
    checks.push({
      id: "hsts",
      category: "headers",
      name: "HTTP Strict Transport Security (HSTS)",
      status: "warn",
      severity: "medium",
      description: infra.isManagedHost
        ? `HSTS absent dans la réponse. Votre hébergeur (${infra.cdn}) peut l'appliquer au niveau edge — vérifiez dans votre configuration.`
        : "HSTS absent. Recommandé pour protéger contre le downgrade SSL une fois la première visite effectuée.",
      recommendation: `Ajoutez l'en-tête HSTS :\n\n# Nginx\nadd_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;\n\n# Apache (.htaccess)\nHeader always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"\n\n// Next.js (next.config.js)\nheaders: [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }]`,
    });
  } else {
    const maxAge = parseInt(hsts.match(/max-age=(\d+)/)?.[1] || "0");
    const sub = hsts.toLowerCase().includes("includesubdomains");
    const preload = hsts.toLowerCase().includes("preload");
    checks.push({
      id: "hsts",
      category: "headers",
      name: "HTTP Strict Transport Security (HSTS)",
      status: maxAge >= 31536000 && sub && preload ? "pass" : "warn",
      severity: maxAge < 31536000 ? "medium" : undefined,
      description:
        maxAge >= 31536000 && sub && preload
          ? "HSTS correctement configuré avec includeSubDomains et preload."
          : `HSTS actif (max-age=${maxAge}) mais ${!sub ? "includeSubDomains manquant" : ""}${!sub && !preload ? " et " : ""}${!preload ? "preload manquant" : ""}.`,
      value: hsts,
      recommendation:
        maxAge < 31536000
          ? "Augmentez max-age à 31536000 (1 an) minimum."
          : undefined,
    });
  }

  // CSP
  const csp = headers.get("content-security-policy") || headers.get("content-security-policy-report-only");
  if (!csp) {
    checks.push({
      id: "csp",
      category: "headers",
      name: "Content Security Policy (CSP)",
      status: "warn",
      severity: "medium",
      description: "Aucune CSP définie. Recommandée pour réduire l'impact d'une éventuelle XSS, mais non bloquante si les inputs sont correctement échappés côté serveur.",
      recommendation: `Implémentez une Content Security Policy :\n\n# Nginx\nadd_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; frame-ancestors 'self';" always;\n\n// Next.js (next.config.js)\nheaders: [{\n  key: 'Content-Security-Policy',\n  value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"\n}]`,
    });
  } else {
    const issues: string[] = [];
    if (csp.includes("'unsafe-eval'")) issues.push("unsafe-eval");
    if (csp.includes("'unsafe-inline'") && csp.includes("script-src")) issues.push("unsafe-inline dans script-src");
    if (csp.includes("* ") || /\s\*\s/.test(csp) || csp.includes("*;")) issues.push("wildcard (*)");
    const hasFrameAncestors = csp.includes("frame-ancestors");
    const hasXFrameOptions = headers.has("x-frame-options");
    if (!hasFrameAncestors && !hasXFrameOptions) issues.push("frame-ancestors absent");

    checks.push({
      id: "csp",
      category: "headers",
      name: "Content Security Policy (CSP)",
      status: issues.length === 0 ? "pass" : "warn",
      severity: issues.length > 0 ? "medium" : undefined,
      description:
        issues.length === 0
          ? "CSP correctement configurée."
          : `CSP définie mais avec des faiblesses : ${issues.join(", ")}.`,
      value: csp.length > 200 ? csp.substring(0, 200) + "..." : csp,
      recommendation: issues.length > 0
        ? `Corrigez: ${issues.join(", ")}. Utilisez des nonces CSP au lieu de unsafe-inline.`
        : undefined,
    });
  }

  // Headers scored as warn when missing (real security impact)
  const scoredHeaders = [
    {
      name: "x-content-type-options",
      id: "x-content-type",
      display: "X-Content-Type-Options",
      severity: "low" as const,
      rec: "Ajoutez l'en-tête :\n\n# Nginx\nadd_header X-Content-Type-Options \"nosniff\" always;\n\n# Apache\nHeader always set X-Content-Type-Options \"nosniff\"\n\n// Next.js\nheaders: [{ key: 'X-Content-Type-Options', value: 'nosniff' }]",
      desc: "Empêche le MIME-type sniffing.",
    },
    {
      name: "x-frame-options",
      id: "x-frame",
      display: "X-Frame-Options (Clickjacking)",
      severity: "medium" as const,
      rec: "Protégez contre le clickjacking :\n\n# Nginx\nadd_header X-Frame-Options \"DENY\" always;\n\n// Next.js\nheaders: [{ key: 'X-Frame-Options', value: 'DENY' }]",
      desc: "Protège contre le clickjacking via iframe.",
    },
    {
      name: "permissions-policy",
      id: "permissions",
      display: "Permissions-Policy",
      severity: "low" as const,
      rec: "Restreignez les APIs navigateur :\n\n# Nginx\nadd_header Permissions-Policy \"camera=(), microphone=(), geolocation=()\" always;",
      desc: "Contrôle l'accès aux APIs sensibles du navigateur.",
    },
  ];

  // X-Frame-Options is satisfied if CSP frame-ancestors is present
  const hasFrameAncestors = csp?.includes("frame-ancestors") ?? false;

  for (const h of scoredHeaders) {
    const value = headers.get(h.name);
    if (!value && h.id === "x-frame" && hasFrameAncestors) {
      checks.push({
        id: h.id,
        category: "headers",
        name: h.display,
        status: "pass",
        description: "Remplacé par la directive CSP frame-ancestors (équivalent moderne).",
      });
      continue;
    }
    checks.push({
      id: h.id,
      category: "headers",
      name: h.display,
      status: value ? "pass" : "warn",
      severity: !value ? h.severity : undefined,
      description: value
        ? `${h.display} est configuré. ${h.desc}`
        : `${h.display} est absent. ${h.desc}`,
      value: value || undefined,
      recommendation: !value ? h.rec : undefined,
    });
  }

  // Informational-only headers (bonnes pratiques, ne pénalisent pas le score)
  const infoHeaders = [
    { name: "referrer-policy", id: "referrer", display: "Referrer-Policy", desc: "Contrôle les informations envoyées dans le header Referer." },
    { name: "cross-origin-opener-policy", id: "coop", display: "Cross-Origin-Opener-Policy (COOP)", desc: "Isole le contexte de navigation pour prévenir les attaques cross-origin." },
    { name: "cross-origin-resource-policy", id: "corp", display: "Cross-Origin-Resource-Policy (CORP)", desc: "Empêche le chargement cross-origin non autorisé des ressources." },
    { name: "cross-origin-embedder-policy", id: "coep", display: "Cross-Origin-Embedder-Policy (COEP)", desc: "Requiert CORP/CORS pour toutes les ressources cross-origin embarquées." },
  ];

  for (const h of infoHeaders) {
    const value = headers.get(h.name);
    checks.push({
      id: h.id,
      category: "headers",
      name: h.display,
      status: value ? "pass" : "info",
      description: value
        ? `${h.display} est configuré.`
        : `${h.display} non défini. ${h.desc} Bonne pratique, rarement critique.`,
      value: value || undefined,
    });
  }

  // X-XSS-Protection
  const xss = headers.get("x-xss-protection");
  checks.push({
    id: "x-xss",
    category: "headers",
    name: "X-XSS-Protection",
    status: xss ? "pass" : "info",
    description: xss
      ? `X-XSS-Protection défini : ${xss}`
      : "X-XSS-Protection absent (déprécié, remplacé par CSP).",
    value: xss || undefined,
  });

  return checks;
}

// =============================================================================
// 3. SERVER INFO LEAKAGE
// =============================================================================

function checkInfoLeakage(headers: Headers): AuditCheck[] {
  const checks: AuditCheck[] = [];

  // Server header — présence d'une version = info (cosmétique, pas exploitable directement)
  const server = headers.get("server");
  if (server) {
    const hasVersion = /\d+\.\d+/.test(server);
    checks.push({
      id: "server-header",
      category: "info-leak",
      name: "En-tête Server",
      status: "info",
      description: hasVersion
        ? `Le serveur s'identifie comme "${server}" (version visible). Recommandation cosmétique : masquer la version.`
        : `Le serveur s'identifie comme "${server}".`,
      value: server,
      recommendation: hasVersion
        ? "Masquez la version du serveur si souhaité. Nginx: server_tokens off; Apache: ServerTokens Prod"
        : undefined,
    });
  } else {
    checks.push({
      id: "server-header",
      category: "info-leak",
      name: "En-tête Server",
      status: "pass",
      description: "L'en-tête Server est absent ou masqué.",
    });
  }

  // X-Powered-By — cosmétique
  const poweredBy = headers.get("x-powered-by");
  if (poweredBy) {
    checks.push({
      id: "x-powered-by",
      category: "info-leak",
      name: "X-Powered-By",
      status: "info",
      description: `Le site expose sa technologie : "${poweredBy}". Information cosmétique, faible impact.`,
      value: poweredBy,
      recommendation: "Supprimez X-Powered-By si souhaité. Express: app.disable('x-powered-by'); PHP: expose_php = Off",
    });
  } else {
    checks.push({
      id: "x-powered-by",
      category: "info-leak",
      name: "X-Powered-By",
      status: "pass",
      description: "X-Powered-By est absent.",
    });
  }

  // X-AspNet-Version — vraie fuite (version précise, historique de CVEs)
  const aspVersion = headers.get("x-aspnet-version");
  if (aspVersion) {
    checks.push({
      id: "x-aspnet",
      category: "info-leak",
      name: "X-AspNet-Version",
      status: "warn",
      severity: "low",
      description: `Version ASP.NET exposée : "${aspVersion}".`,
      value: aspVersion,
      recommendation: "Désactivez dans web.config: <httpRuntime enableVersionHeader=\"false\" />",
    });
  }

  // X-Generator — purement cosmétique
  const generator = headers.get("x-generator");
  if (generator) {
    checks.push({
      id: "x-generator",
      category: "info-leak",
      name: "X-Generator",
      status: "info",
      description: `Générateur exposé : "${generator}". Information cosmétique.`,
      value: generator,
      recommendation: "Supprimez l'en-tête X-Generator si souhaité.",
    });
  }

  return checks;
}

// =============================================================================
// 3b. EXPOSED SECRETS — scan HTML + inline scripts for high-value credentials
// =============================================================================

interface SecretPattern {
  id: string;
  name: string;
  regex: RegExp;
  severity: "critical" | "high" | "medium";
}

const SECRET_PATTERNS: SecretPattern[] = [
  { id: "aws-access-key", name: "AWS Access Key", regex: /\bAKIA[0-9A-Z]{16}\b/, severity: "critical" },
  { id: "aws-secret-ref", name: "AWS Secret Access Key (contextuel)", regex: /aws_secret_access_key\s*[:=]\s*["'][A-Za-z0-9/+=]{40}["']/i, severity: "critical" },
  { id: "stripe-live", name: "Clé secrète Stripe (live)", regex: /\bsk_live_[A-Za-z0-9]{24,}\b/, severity: "critical" },
  { id: "stripe-test", name: "Clé secrète Stripe (test)", regex: /\bsk_test_[A-Za-z0-9]{24,}\b/, severity: "high" },
  { id: "stripe-restricted", name: "Clé restricted Stripe", regex: /\brk_(live|test)_[A-Za-z0-9]{24,}\b/, severity: "critical" },
  { id: "github-pat", name: "GitHub Personal Access Token", regex: /\bghp_[A-Za-z0-9]{36}\b/, severity: "critical" },
  { id: "github-oauth", name: "GitHub OAuth Token", regex: /\bgho_[A-Za-z0-9]{36}\b/, severity: "critical" },
  { id: "github-fine-grained", name: "GitHub Fine-grained Token", regex: /\bgithub_pat_[A-Za-z0-9_]{82}\b/, severity: "critical" },
  { id: "slack-token", name: "Slack Token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, severity: "critical" },
  { id: "slack-webhook", name: "Slack Webhook URL", regex: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]{24}/, severity: "high" },
  { id: "private-key", name: "Clé privée", regex: /-----BEGIN (?:RSA|OPENSSH|EC|DSA|PGP)\s+PRIVATE KEY-----/, severity: "critical" },
  { id: "sendgrid", name: "Clé API SendGrid", regex: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/, severity: "critical" },
  { id: "mailgun", name: "Clé API Mailgun", regex: /(?:mailgun|mg_api_key|mailgun_api_key|MAILGUN_[A-Z_]+)[\s\S]{0,120}?\bkey-[a-f0-9]{32}\b/i, severity: "critical" },
  { id: "twilio-sk", name: "Twilio API Key", regex: /(?:twilio|accountSid|authToken|TWILIO_[A-Z_]+)[\s\S]{0,120}?\bSK[a-f0-9]{32}\b/i, severity: "critical" },
  { id: "openai", name: "Clé API OpenAI", regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/, severity: "critical" },
  { id: "anthropic", name: "Clé API Anthropic", regex: /\bsk-ant-[A-Za-z0-9_-]{40,}\b/, severity: "critical" },
];

// Strip blocks where secrets are usually documented (code samples in blog posts), not deployed.
function stripDocumentationBlocks(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, "")
    .replace(/<code\b[\s\S]*?<\/code>/gi, "");
}

// Detects Supabase service_role JWTs: the payload (middle segment) is base64url-encoded
// JSON with { "role": "service_role" } — keyword can't be matched on the raw token.
function findSupabaseServiceRoleToken(source: string): string | null {
  const jwtRegex = /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\b/g;
  let match: RegExpExecArray | null;
  while ((match = jwtRegex.exec(source)) !== null) {
    const parts = match[0].split(".");
    if (parts.length !== 3) continue;
    try {
      const payload = Buffer.from(
        parts[1].replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(parts[1].length / 4) * 4, "="),
        "base64"
      ).toString("utf8");
      const json = JSON.parse(payload);
      if (json && typeof json === "object" && json.role === "service_role") {
        return match[0];
      }
    } catch {
      // Not a valid JWT payload
    }
  }
  return null;
}

function redactSecret(raw: string): string {
  return raw.length > 20 ? `${raw.slice(0, 8)}…${raw.slice(-4)}` : raw;
}

function checkSecretsExposure(html: string): AuditCheck[] {
  const checks: AuditCheck[] = [];
  const sourceForScan = stripDocumentationBlocks(html);

  const findings: { id: string; name: string; severity: "critical" | "high" | "medium"; sample: string }[] = [];

  for (const pattern of SECRET_PATTERNS) {
    const match = pattern.regex.exec(sourceForScan);
    if (match) {
      findings.push({ id: pattern.id, name: pattern.name, severity: pattern.severity, sample: redactSecret(match[0]) });
    }
  }

  // Supabase service_role JWT — decoded, not regex-matched on the raw token
  const supabaseToken = findSupabaseServiceRoleToken(sourceForScan);
  if (supabaseToken) {
    findings.push({
      id: "supabase-service",
      name: "Supabase service_role JWT",
      severity: "critical",
      sample: redactSecret(supabaseToken),
    });
  }

  if (findings.length === 0) {
    checks.push({
      id: "secrets-scan",
      category: "info-leak",
      name: "Secrets exposés dans le HTML",
      status: "pass",
      description: "Aucun secret à haute valeur (AWS/Stripe/GitHub/Slack/clé privée/Supabase service_role…) détecté.",
    });
    return checks;
  }

  const severityRank = { critical: 0, high: 1, medium: 2 } as const;
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  for (const finding of findings) {
    checks.push({
      id: `secret-${finding.id}`,
      category: "info-leak",
      name: `Secret exposé : ${finding.name}`,
      status: "fail",
      severity: finding.severity,
      description: `${finding.name} détecté dans le HTML ou un script inline. Ces secrets ne doivent JAMAIS être présents côté client.`,
      value: finding.sample,
      recommendation: "Révoquez ce secret immédiatement, régénérez-le, et déplacez-le côté serveur (variables d'environnement, secret manager).",
    });
  }

  return checks;
}

// =============================================================================
// 4. COOKIES
// =============================================================================

// Cookies analytics/tracking (tiers ou first-party instrumentés) — ne pas
// pénaliser comme un cookie de session quand HttpOnly manque (JS doit y accéder).
const TRACKING_COOKIE_PATTERNS = [
  /^_ga/i, /^_gid$/i, /^_gcl/i, /^_gat/i, /^_fbp$/i, /^_fbc$/i,
  /^_hj/i, /^_pin_/i, /^_tt_/i, /^_uetsid$/i, /^_uetvid$/i,
  /^ajs_/i, /^amplitude_/i, /^mp_/i, /^intercom/i, /^__hs/i,
  /^NID$/i, /^IDE$/i, /^VISITOR_INFO/i, /^YSC$/i, /^PREF$/i,
];

function classifyCookie(name: string): "session" | "tracking" | "other" {
  const lower = name.toLowerCase();
  if (TRACKING_COOKIE_PATTERNS.some((r) => r.test(name))) return "tracking";
  if (
    lower.includes("session") ||
    lower === "sid" ||
    lower.endsWith("_sid") ||
    lower.includes("auth") ||
    lower.includes("token") ||
    lower.includes("csrf") ||
    lower.includes("xsrf") ||
    lower === "phpsessid" ||
    lower === "jsessionid" ||
    lower === "connect.sid" ||
    lower.startsWith("wordpress_logged_in")
  ) {
    return "session";
  }
  return "other";
}

function checkCookies(headers: Headers): AuditCheck[] {
  const checks: AuditCheck[] = [];
  const setCookies = headers.getSetCookie?.() || [];

  if (setCookies.length === 0) {
    checks.push({
      id: "cookies",
      category: "cookies",
      name: "Cookies",
      status: "info",
      description: "Aucun cookie défini sur la page d'accueil.",
    });
    return checks;
  }

  for (const cookie of setCookies) {
    const name = cookie.split("=")[0]?.trim() || "inconnu";
    const lower = cookie.toLowerCase();
    const kind = classifyCookie(name);

    const missingSecure = !lower.includes("secure");
    const missingHttpOnly = !lower.includes("httponly");
    const missingSameSite = !lower.includes("samesite");

    // Cookies de tracking : souvent set par des scripts tiers sans HttpOnly (normal).
    // On ne signale que si le cookie est servi en clair (Secure absent sur HTTPS).
    if (kind === "tracking") {
      checks.push({
        id: `cookie-${name}`,
        category: "cookies",
        name: `Cookie tiers/analytics : ${name}`,
        status: missingSecure ? "info" : "pass",
        description: missingSecure
          ? `Cookie de tracking "${name}" sans flag Secure. Peu impactant (données non sensibles).`
          : `Cookie de tracking "${name}" correctement configuré.`,
        value: cookie.length > 150 ? cookie.substring(0, 150) + "..." : cookie,
      });
      continue;
    }

    const issues: string[] = [];
    if (missingSecure) issues.push("Secure");
    // HttpOnly n'est pertinent que pour cookies de session/auth
    if (missingHttpOnly && kind === "session") issues.push("HttpOnly");
    if (missingSameSite) issues.push("SameSite");

    let status: "pass" | "warn" | "fail" = "pass";
    let severity: "critical" | "high" | "medium" | "low" | undefined;

    if (issues.length > 0) {
      if (kind === "session" && (missingSecure || missingHttpOnly)) {
        status = "fail";
        severity = missingSecure && missingHttpOnly ? "high" : "medium";
      } else {
        status = "warn";
        severity = "low";
      }
    }

    checks.push({
      id: `cookie-${name}`,
      category: "cookies",
      name: `Cookie: ${name}`,
      status,
      severity,
      description:
        issues.length === 0
          ? `"${name}" a tous les attributs de sécurité nécessaires.`
          : `"${name}" : attributs manquants — ${issues.join(", ")}.${kind === "session" ? " (cookie de session)" : ""}`,
      value: cookie.length > 150 ? cookie.substring(0, 150) + "..." : cookie,
      recommendation:
        issues.length > 0
          ? `Ajoutez: ${issues.map((i) => (i === "SameSite" ? "SameSite=Lax" : i)).join("; ")}`
          : undefined,
    });
  }

  return checks;
}

// =============================================================================
// 5. OWASP — Sensitive Files & Directories
// =============================================================================

async function checkOWASP(baseUrl: string, html: string, soft404: Soft404Detector): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  const origin = new URL(baseUrl).origin;

  // Sensitive paths — validated via strict content signature (not just keyword presence)
  const sensitivePaths = [
    { path: "/.env", name: "Fichier .env", severity: "critical" as const, desc: "Variables d'environnement (clés API, mots de passe)", contentCheck: /^[A-Z][A-Z0-9_]+=[^\n<]{1,200}$/m, mustNotBeHtml: true },
    { path: "/.git/HEAD", name: "Répertoire .git", severity: "critical" as const, desc: "Code source et historique Git", contentCheck: /^ref:\s+refs\/heads\/[\w.-]+\s*$/, mustNotBeHtml: true },
    { path: "/.git/config", name: "Configuration .git", severity: "critical" as const, desc: "Configuration Git exposée", contentCheck: /\[core\]|\[remote "/, mustNotBeHtml: true },
    { path: "/phpmyadmin/", name: "phpMyAdmin", severity: "critical" as const, desc: "Interface de gestion de base de données", contentCheck: /phpMyAdmin|pma_navigation|<form[^>]+name="login_form"/i, mustNotBeHtml: false },
    { path: "/adminer.php", name: "Adminer", severity: "critical" as const, desc: "Interface de gestion de base de données", contentCheck: /Adminer [\d.]+|<title>[^<]*Adminer|name="auth\[server\]"/i, mustNotBeHtml: false },
    { path: "/server-status", name: "Apache Server Status", severity: "high" as const, desc: "Informations internes du serveur Apache", contentCheck: /Apache Server Status for |Total Accesses:\s*\d/, mustNotBeHtml: false },
    { path: "/server-info", name: "Apache Server Info", severity: "high" as const, desc: "Configuration Apache exposée", contentCheck: /Apache Server Information|<h1>Apache Server Information/, mustNotBeHtml: false },
    { path: "/.htaccess", name: "Fichier .htaccess", severity: "high" as const, desc: "Configuration Apache", contentCheck: /^\s*RewriteEngine\s+(on|off)|^\s*Options\s+[+-]?\w+/im, mustNotBeHtml: true },
    { path: "/web.config", name: "Fichier web.config", severity: "high" as const, desc: "Configuration IIS/ASP.NET", contentCheck: /^\s*<\?xml[\s\S]*?<configuration\b/i, mustNotBeHtml: true },
    { path: "/backup.zip", name: "Fichier de sauvegarde ZIP", severity: "critical" as const, desc: "Archive de sauvegarde exposée", contentCheck: null, mustNotBeHtml: true, contentType: "application/zip" },
    { path: "/backup.sql", name: "Dump SQL", severity: "critical" as const, desc: "Dump de base de données exposé", contentCheck: /^(--|\/\*!)|CREATE TABLE\s+[`"]|INSERT INTO\s+[`"]|mysqldump/im, mustNotBeHtml: true },
    { path: "/phpinfo.php", name: "phpinfo()", severity: "high" as const, desc: "Informations complètes sur la configuration PHP", contentCheck: /<title>phpinfo\(\)/i, mustNotBeHtml: false },
    { path: "/info.php", name: "info.php", severity: "high" as const, desc: "Informations PHP exposées", contentCheck: /<title>phpinfo\(\)/i, mustNotBeHtml: false },
    { path: "/.DS_Store", name: "Fichier .DS_Store", severity: "low" as const, desc: "Métadonnées macOS (structure de répertoire)", contentCheck: null, mustNotBeHtml: true, contentType: "application/octet-stream", magicBytes: "Bud1" },
  ];

  const exposed: AuditCheck[] = [];
  const safe: string[] = [];

  const results = await Promise.all(
    sensitivePaths.map(async (item) => {
      const res = await safeFetch(`${origin}${item.path}`, {
        method: "GET",
        redirect: "manual",
        timeout: 3000,
      });
      let bodyMatch = false;
      if (res && res.status === 200) {
        try {
          const contentType = res.headers.get("content-type") || "";

          if (item.contentType && !contentType.includes(item.contentType)) {
            // Expected a specific binary type but got something else → false positive
            return { item, status: res.status, bodyMatch: false };
          }

          const body = await res.text();

          if (soft404.isSoft404(body, res.status)) {
            return { item, status: res.status, bodyMatch: false };
          }

          if (item.mustNotBeHtml) {
            const startsWithHtml = /^\s*<(?:!doctype|html|head|body)/i.test(body);
            if (contentType.includes("text/html") || startsWithHtml) {
              return { item, status: res.status, bodyMatch: false };
            }
          }

          if ("magicBytes" in item && item.magicBytes) {
            bodyMatch = body.startsWith(item.magicBytes);
          } else if (item.contentCheck) {
            bodyMatch = item.contentCheck.test(body.substring(0, 5000));
          } else if (item.contentType) {
            // No content regex but content-type matched
            bodyMatch = true;
          }
        } catch {
          bodyMatch = false;
        }
      }
      return { item, status: res?.status || 0, bodyMatch };
    })
  );

  for (const { item, status, bodyMatch } of results) {
    if (status === 200 && bodyMatch) {
      exposed.push({
        id: `owasp-${item.path.replace(/[/.]/g, "-")}`,
        category: "owasp",
        name: item.name,
        status: "fail",
        severity: item.severity,
        description: `${item.name} est accessible publiquement ! ${item.desc}`,
        value: `${origin}${item.path} → HTTP ${status}`,
        recommendation: `Bloquez l'accès à ${item.path} via votre serveur web ou .htaccess.`,
      });
    } else {
      safe.push(item.path);
    }
  }

  if (soft404.enabled) {
    checks.push({
      id: "owasp-soft404",
      category: "owasp",
      name: "Détection Soft 404 (Catch-All)",
      status: "info",
      description: "Le serveur retourne HTTP 200 pour les pages inexistantes. Courant sur les SPA (Next.js, Nuxt, React Router) — les probes utilisent une empreinte structurelle pour éviter les faux positifs.",
    });
  }

  checks.push(...exposed);

  if (exposed.length === 0) {
    checks.push({
      id: "owasp-sensitive-files",
      category: "owasp",
      name: "Fichiers sensibles",
      status: "pass",
      description: `${safe.length} chemins sensibles testés, aucun exposé publiquement.`,
    });
  }

  // HTTP Methods — info only (CDN/framework filtrent souvent ; vrai risque rare)
  const optionsRes = await safeFetch(baseUrl, { method: "OPTIONS", timeout: 3000 });
  if (optionsRes) {
    const allow = optionsRes.headers.get("allow") || optionsRes.headers.get("access-control-allow-methods") || "";
    const dangerous = ["TRACE", "CONNECT"].filter((m) => allow.toUpperCase().includes(m));
    if (dangerous.length > 0) {
      checks.push({
        id: "http-methods",
        category: "owasp",
        name: "Méthodes HTTP dangereuses",
        status: "warn",
        severity: "low",
        description: `Méthodes potentiellement dangereuses activées : ${dangerous.join(", ")}. Risque réel faible (bloquées par les navigateurs modernes).`,
        value: allow,
        recommendation: `Désactivez ${dangerous.join(", ")} dans la configuration serveur.`,
      });
    } else if (allow) {
      checks.push({
        id: "http-methods",
        category: "owasp",
        name: "Méthodes HTTP autorisées",
        status: "info",
        description: `Méthodes disponibles : ${allow}.`,
        value: allow,
      });
    }
  }

  // CORS — wildcard n'est pas critique si pas de credentials
  const corsRes = await safeFetch(baseUrl, {
    headers: { Origin: "https://evil-attacker.example" } as Record<string, string>,
    timeout: 3000,
  });
  if (corsRes) {
    const acao = corsRes.headers.get("access-control-allow-origin");
    const allowCreds = corsRes.headers.get("access-control-allow-credentials")?.toLowerCase() === "true";
    if (acao === "*" && allowCreds) {
      checks.push({
        id: "cors-wildcard-creds",
        category: "owasp",
        name: "CORS : wildcard avec credentials",
        status: "fail",
        severity: "high",
        description: "Access-Control-Allow-Origin: * combiné avec Allow-Credentials: true. Combinaison refusée par les navigateurs mais indique une configuration incorrecte.",
        value: acao,
        recommendation: "Spécifiez une origine précise ou retirez Allow-Credentials.",
      });
    } else if (acao === "*") {
      checks.push({
        id: "cors-wildcard",
        category: "owasp",
        name: "CORS Wildcard (*)",
        status: "info",
        description: "Access-Control-Allow-Origin: *. Acceptable pour une API publique sans authentification par cookie. À restreindre pour des endpoints privés.",
        value: acao,
      });
    } else if (acao === "https://evil-attacker.example") {
      checks.push({
        id: "cors-reflect",
        category: "owasp",
        name: "CORS Origin Reflection",
        status: "fail",
        severity: "critical",
        description: "Le serveur reflète l'origine de la requête ! Vulnérabilité CORS critique.",
        value: acao,
        recommendation: "N'utilisez JAMAIS la réflection d'origine. Utilisez une whitelist de domaines.",
      });
    } else if (acao) {
      checks.push({
        id: "cors",
        category: "owasp",
        name: "Configuration CORS",
        status: "pass",
        description: `CORS restreint à : ${acao}`,
        value: acao,
      });
    }
  }

  // SRI — uniquement sur les CDNs externes (les bundles self-hosted avec hash dans l'URL ont déjà l'intégrité)
  const cleanHtml = stripScriptsStylesComments(html);
  // Extract only script tags with src (we need original html for this, not stripped)
  const scriptTags = html.match(/<script\b[^>]*\bsrc\s*=\s*["'][^"']+["'][^>]*>/gi) || [];
  const origin_ = origin;
  const thirdPartyCdns = /(\/\/)(?:cdn\.|cdnjs\.|unpkg\.com|jsdelivr\.net|ajax\.googleapis\.com|code\.jquery\.com|maxcdn\.)/i;
  const externalScripts = scriptTags.filter((s) => {
    const m = s.match(/src\s*=\s*["']([^"']+)["']/i);
    if (!m) return false;
    const src = m[1];
    if (src.startsWith("//") || src.startsWith("http://") || src.startsWith("https://")) {
      try {
        const u = new URL(src.startsWith("//") ? `https:${src}` : src);
        return u.origin !== origin_;
      } catch {
        return false;
      }
    }
    return false;
  });
  const thirdPartyCdnScripts = externalScripts.filter((s) => thirdPartyCdns.test(s));
  if (thirdPartyCdnScripts.length > 0) {
    const withSRI = thirdPartyCdnScripts.filter((s) => s.includes("integrity="));
    checks.push({
      id: "sri",
      category: "owasp",
      name: "Subresource Integrity (SRI)",
      status: withSRI.length === thirdPartyCdnScripts.length ? "pass" : "info",
      description:
        withSRI.length === thirdPartyCdnScripts.length
          ? `Tous les ${thirdPartyCdnScripts.length} scripts CDN externes ont un attribut integrity.`
          : `${withSRI.length}/${thirdPartyCdnScripts.length} scripts chargés depuis un CDN public ont un attribut integrity.`,
      recommendation:
        withSRI.length < thirdPartyCdnScripts.length
          ? "Ajoutez integrity= et crossorigin= sur les scripts chargés depuis des CDN publics (unpkg, jsdelivr, cdnjs)."
          : undefined,
    });
  }

  // Mixed content — uniquement dans des attributs de chargement de ressources
  const resourceAttrRe = /(?:src|href)\s*=\s*["'](http:\/\/[^"']+)["']/gi;
  const mixedAll: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = resourceAttrRe.exec(cleanHtml)) !== null) {
    const url = m[1];
    // Ignorer les liens texte (rel="canonical" etc. sur des endpoints HTTP n'est pas du mixed content rendu)
    // Vérifier uniquement les balises qui chargent effectivement une ressource
    const tagStart = cleanHtml.lastIndexOf("<", m.index);
    const tagSlice = cleanHtml.substring(tagStart, m.index + m[0].length + 1).toLowerCase();
    if (/^<(?:script|link\s[^>]*rel=["'](?:stylesheet|preload|preconnect)|img|iframe|video|audio|source|embed|object)\b/.test(tagSlice)) {
      mixedAll.push(url);
    }
  }
  const mixedUnique = [...new Set(mixedAll)];
  if (mixedUnique.length > 0) {
    checks.push({
      id: "mixed-content",
      category: "owasp",
      name: "Contenu mixte (Mixed Content)",
      status: "fail",
      severity: "high",
      description: `${mixedUnique.length} ressource(s) chargée(s) en HTTP détectée(s).`,
      value: mixedUnique.slice(0, 3).join(", "),
      recommendation: "Migrez toutes les ressources vers HTTPS.",
    });
  } else {
    checks.push({
      id: "mixed-content",
      category: "owasp",
      name: "Contenu mixte (Mixed Content)",
      status: "pass",
      description: "Aucune ressource HTTP non sécurisée détectée.",
    });
  }

  return checks;
}

// =============================================================================
// 5b. DIRECTORY LISTING & GRAPHQL INTROSPECTION
// =============================================================================

async function checkDirectoryListing(baseUrl: string, soft404: Soft404Detector): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  const origin = new URL(baseUrl).origin;
  const paths = [
    "/uploads/", "/files/", "/assets/", "/images/",
    "/backup/", "/backups/", "/logs/", "/log/",
    "/old/", "/tmp/", "/temp/", "/static/",
  ];

  const listingRegex = /<title>\s*Index of \/[^<]*<\/title>|<h1>\s*Index of \/[^<]*<\/h1>/i;

  const results = await Promise.all(
    paths.map(async (path) => {
      const res = await safeFetch(`${origin}${path}`, { method: "GET", timeout: 3000, redirect: "manual" });
      if (!res || res.status !== 200) return null;
      const body = await res.text().catch(() => "");
      if (soft404.isSoft404(body, res.status)) return null;
      if (listingRegex.test(body)) return path;
      return null;
    })
  );

  const exposed = results.filter((p): p is string => p !== null);

  if (exposed.length > 0) {
    checks.push({
      id: "dir-listing",
      category: "owasp",
      name: "Listage de répertoires activé",
      status: "fail",
      severity: "high",
      description: `Listage de répertoires accessible sur ${exposed.length} chemin(s). Les attaquants peuvent énumérer les fichiers.`,
      value: exposed.join(", "),
      recommendation: `Désactivez l'autoindex :\n\n# Apache (.htaccess)\nOptions -Indexes\n\n# Nginx\nautoindex off;`,
    });
  }

  return checks;
}

async function checkGraphQLIntrospection(baseUrl: string): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  const origin = new URL(baseUrl).origin;
  const paths = ["/graphql", "/api/graphql", "/query", "/v1/graphql", "/graphiql"];
  const introspectionQuery = JSON.stringify({
    query: "{__schema{types{name}}}",
  });

  for (const path of paths) {
    const res = await safeFetch(`${origin}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" } as Record<string, string>,
      body: introspectionQuery,
      timeout: 4000,
    });
    if (!res?.ok) continue;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) continue;
    const body = await res.text().catch(() => "");
    try {
      const parsed = JSON.parse(body);
      const types = parsed?.data?.__schema?.types;
      if (Array.isArray(types) && types.length > 0) {
        checks.push({
          id: "graphql-introspection",
          category: "owasp",
          name: "GraphQL : introspection activée",
          status: "warn",
          severity: "medium",
          description: `L'endpoint GraphQL ${path} permet l'introspection (${types.length} types exposés). Un attaquant peut cartographier tout le schéma.`,
          value: `${origin}${path}`,
          recommendation: `Désactivez l'introspection en production :\n\n// Apollo Server\nnew ApolloServer({ introspection: false })\n\n// graphql-yoga\ncreateYoga({ graphiql: false, maskedErrors: true })\n\n// Hasura : désactivez via console ou HASURA_GRAPHQL_ENABLE_DISABLED_APIS`,
        });
        return checks; // One finding is enough
      }
    } catch {
      // Not JSON
    }
  }

  return checks;
}

// =============================================================================
// 6. INFRASTRUCTURE — DNS, WAF, security.txt
// =============================================================================

async function checkInfrastructure(baseUrl: string, headers: Headers): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  const origin = new URL(baseUrl).origin;
  const hostname = new URL(baseUrl).hostname;

  // security.txt (RFC 9116)
  const secTxtPaths = ["/.well-known/security.txt", "/security.txt"];
  let securityTxtFound = false;
  for (const path of secTxtPaths) {
    const res = await safeFetch(`${origin}${path}`, { timeout: 3000 });
    if (res?.ok) {
      const text = await res.text();
      if (text.includes("Contact:")) {
        securityTxtFound = true;
        const hasExpires = text.includes("Expires:");
        checks.push({
          id: "security-txt",
          category: "infra",
          name: "security.txt (RFC 9116)",
          status: hasExpires ? "pass" : "warn",
          severity: !hasExpires ? "low" : undefined,
          description: hasExpires
            ? "Fichier security.txt correctement configuré avec date d'expiration."
            : "security.txt trouvé mais sans champ Expires: (requis par RFC 9116).",
          value: text.substring(0, 200),
          recommendation: !hasExpires ? "Ajoutez un champ Expires: à votre security.txt." : undefined,
        });
        break;
      }
    }
  }
  if (!securityTxtFound) {
    checks.push({
      id: "security-txt",
      category: "infra",
      name: "security.txt (RFC 9116)",
      status: "info",
      description: "Aucun fichier security.txt trouvé. Utile pour permettre aux chercheurs de signaler des vulnérabilités, mais optionnel.",
      recommendation: "Créez /.well-known/security.txt avec un Contact: et un Expires: (voir securitytxt.org).",
    });
  }

  // WAF Detection
  const wafIndicators: { header: string; value: string; waf: string }[] = [
    { header: "server", value: "cloudflare", waf: "Cloudflare WAF" },
    { header: "x-sucuri-id", value: "", waf: "Sucuri WAF" },
    { header: "x-cdn", value: "incapsula", waf: "Imperva/Incapsula" },
    { header: "x-akamai-transformed", value: "", waf: "Akamai" },
    { header: "x-protected-by", value: "", waf: "Unknown WAF" },
    { header: "x-waf-event-info", value: "", waf: "Unknown WAF" },
  ];

  let wafDetected = "";
  for (const ind of wafIndicators) {
    const val = headers.get(ind.header);
    if (val && (ind.value === "" || val.toLowerCase().includes(ind.value))) {
      wafDetected = ind.waf;
      break;
    }
  }

  checks.push({
    id: "waf",
    category: "infra",
    name: "Pare-feu applicatif (WAF)",
    status: wafDetected ? "pass" : "info",
    description: wafDetected
      ? `WAF détecté : ${wafDetected}. Le site est protégé contre les attaques web courantes.`
      : "Aucun WAF détecté dans les en-têtes. Vérification non concluante (certains WAF restent invisibles).",
    value: wafDetected || undefined,
    recommendation: !wafDetected
      ? "Mettez en place un WAF (Cloudflare, Sucuri, ModSecurity) pour filtrer le trafic malveillant."
      : undefined,
  });

  // DNS checks — only relevant if the domain is used for sending email (MX present)
  try {
    const [mxRes, txtRes] = await Promise.all([
      safeFetch(`https://dns.google/resolve?name=${hostname}&type=MX`, { timeout: 5000 }),
      safeFetch(`https://dns.google/resolve?name=${hostname}&type=TXT`, { timeout: 5000 }),
    ]);

    const mxRecords: string[] = mxRes?.ok
      ? ((await mxRes.json()).Answer || [])
          .filter((r: { type: number }) => r.type === 15)
          .map((r: { data: string }) => r.data)
      : [];
    const hasEmail = mxRecords.length > 0;

    const txtRecords: string[] = txtRes?.ok
      ? ((await txtRes.json()).Answer || [])
          .filter((r: { type: number }) => r.type === 16)
          .map((r: { data: string }) => r.data)
      : [];

    const spf = txtRecords.find((r) => r.includes("v=spf1"));

    if (hasEmail) {
      // Domain sends email → SPF/DMARC matter
      checks.push({
        id: "dns-spf",
        category: "infra",
        name: "SPF (Sender Policy Framework)",
        status: spf ? "pass" : "warn",
        severity: !spf ? "low" : undefined,
        description: spf
          ? "Enregistrement SPF configuré."
          : "Aucun SPF trouvé alors que le domaine envoie des emails (MX présents). Risque d'usurpation.",
        value: spf?.substring(0, 200),
        recommendation: !spf
          ? "Ajoutez un enregistrement TXT SPF : v=spf1 include:votre_provider -all"
          : undefined,
      });

      const dmarcRes = await safeFetch(
        `https://dns.google/resolve?name=_dmarc.${hostname}&type=TXT`,
        { timeout: 5000 }
      );
      let dmarc = "";
      if (dmarcRes?.ok) {
        const dmarcData = await dmarcRes.json();
        dmarc =
          (dmarcData.Answer || [])
            .find((r: { data: string }) => r.data?.includes("v=DMARC1"))
            ?.data || "";
      }

      checks.push({
        id: "dns-dmarc",
        category: "infra",
        name: "DMARC (Email Authentication)",
        status: dmarc ? "pass" : "warn",
        severity: !dmarc ? "low" : undefined,
        description: dmarc
          ? "DMARC configuré."
          : "Aucun DMARC trouvé alors que le domaine envoie des emails.",
        value: dmarc?.substring(0, 200) || undefined,
        recommendation: !dmarc
          ? "Ajoutez un TXT _dmarc : v=DMARC1; p=quarantine; rua=mailto:dmarc@votredomaine.com"
          : undefined,
      });
    } else {
      // Domaine sans email → info seulement
      checks.push({
        id: "dns-email",
        category: "infra",
        name: "Authentification email (SPF/DMARC)",
        status: "info",
        description: "Aucun enregistrement MX détecté — le domaine n'envoie pas d'emails. SPF/DMARC non applicables.",
      });
    }
  } catch {
    // DNS check failed silently
  }

  // DNSSEC
  try {
    const dnssecRes = await safeFetch(
      `https://dns.google/resolve?name=${hostname}&type=A&do=true`,
      { timeout: 5000 }
    );
    if (dnssecRes?.ok) {
      const dnssecData = await dnssecRes.json();
      const hasDNSSEC = dnssecData.AD === true;
      checks.push({
        id: "dnssec",
        category: "infra",
        name: "DNSSEC",
        status: hasDNSSEC ? "pass" : "info",
        description: hasDNSSEC
          ? "DNSSEC est activé. Les réponses DNS sont authentifiées."
          : "DNSSEC n'est pas activé. Bonnes pratiques recommandées, mais ce n'est pas bloquant pour tous les sites.",
        recommendation: !hasDNSSEC
          ? "Activez DNSSEC chez votre registrar pour protéger contre le DNS spoofing."
          : undefined,
      });
    }
  } catch {
    // DNSSEC check failed
  }

  return checks;
}

// =============================================================================
// 7. RGPD / COMPLIANCE
// =============================================================================

async function checkRGPD(html: string, baseUrl: string): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  const origin = new URL(baseUrl).origin;

  // Privacy policy — require an actual <a href="…"> pointing to a privacy-like URL
  // (text-only match over-counts: a blog post discussing privacy would false-pass)
  const privacyHrefRegex =
    /<a\b[^>]*\bhref\s*=\s*["'][^"']*\/(?:privacy(?:-policy)?|politique-de-confidentialite|politique-confidentialite|confidentialite|donnees-personnelles|privacybeleid|gegevensbescherming|datenschutz|datenschutzerklaerung|gdpr|rgpd)(?:[/?#"']|\.[a-z]+["'])/i;
  let hasPrivacyLink = privacyHrefRegex.test(html);

  // Legal notice — require an actual <a href="…">
  const legalHrefRegex =
    /<a\b[^>]*\bhref\s*=\s*["'][^"']*\/(?:mentions-legales|mentions_legales|legal(?:-notice)?|impressum|wettelijke-vermeldingen)(?:[/?#"']|\.[a-z]+["'])/i;
  let hasLegal = legalHrefRegex.test(html);

  // Fallback: probe common page URLs when not found in HTML
  // (handles client-side rendered links not visible in raw HTML)
  if (!hasPrivacyLink || !hasLegal) {
    const probes: { path: string; target: "privacy" | "legal" }[] = [];
    if (!hasPrivacyLink) {
      probes.push(
        { path: "/privacy-policy", target: "privacy" },
        { path: "/privacy", target: "privacy" },
        { path: "/politique-de-confidentialite", target: "privacy" },
        { path: "/confidentialite", target: "privacy" },
        { path: "/privacybeleid", target: "privacy" },
        { path: "/datenschutz", target: "privacy" },
      );
    }
    if (!hasLegal) {
      probes.push(
        { path: "/mentions-legales", target: "legal" },
        { path: "/legal", target: "legal" },
        { path: "/legal-notice", target: "legal" },
        { path: "/impressum", target: "legal" },
        { path: "/wettelijke-vermeldingen", target: "legal" },
      );
    }
    await Promise.all(
      probes.map(async ({ path, target }) => {
        const res = await safeFetch(`${origin}${path}`, { method: "HEAD", timeout: 3000, redirect: "follow" });
        if (res?.ok) {
          if (target === "privacy") hasPrivacyLink = true;
          else hasLegal = true;
        }
      })
    );
  }

  // Tracking scripts (URL-based, low FP) — computed here so it gates the privacy severity
  const hasTracking =
    /googletagmanager\.com\/gtm\.js/i.test(html) ||
    /googletagmanager\.com\/gtag\/js/i.test(html) ||
    /google-analytics\.com/i.test(html) ||
    /\bgtag\s*\(/i.test(html) ||
    /connect\.facebook\.net/i.test(html) ||
    /\bfbq\s*\(/i.test(html) ||
    /static\.hotjar\.com|script\.hotjar\.com/i.test(html) ||
    /js\.hs-scripts\.com/i.test(html);

  // Privacy policy severity depends on whether data is actually collected
  // (tracking scripts or forms). A static brochure site without collection has no RGPD obligation.
  const collectsPersonalData = (() => {
    const inputs = html.match(/<input\b[^>]*>/gi) || [];
    return inputs.some((i) => /type\s*=\s*["']email["']|name\s*=\s*["'](?:email|phone|tel|nom|name)["']/i.test(i));
  })();
  const privacyRequired = hasTracking || collectsPersonalData;
  checks.push({
    id: "rgpd-privacy",
    category: "rgpd",
    name: "Politique de confidentialité",
    status: hasPrivacyLink ? "pass" : privacyRequired ? "warn" : "info",
    severity: !hasPrivacyLink && privacyRequired ? "medium" : undefined,
    description: hasPrivacyLink
      ? "Un lien vers une politique de confidentialité a été détecté."
      : privacyRequired
      ? "Aucun lien vers une politique de confidentialité dans le HTML initial, alors que des trackers ou des formulaires collectent des données."
      : "Aucune politique de confidentialité détectée. Recommandée mais non obligatoire pour un site statique sans collecte.",
    recommendation: !hasPrivacyLink && privacyRequired
      ? "Ajoutez un lien vers votre politique de confidentialité dans le footer de toutes les pages."
      : undefined,
  });

  checks.push({
    id: "rgpd-legal",
    category: "rgpd",
    name: "Mentions légales",
    status: hasLegal ? "pass" : "warn",
    severity: !hasLegal ? "medium" : undefined,
    description: hasLegal
      ? "Mentions légales détectées."
      : "Aucune mention légale détectée. Obligatoire pour les sites professionnels.",
    recommendation: !hasLegal
      ? "Ajoutez des mentions légales (raison sociale, SIRET, éditeur, hébergeur)."
      : undefined,
  });

  // Cookie consent banner — detected via actual script URLs or DOM id/class markers
  // (not just keyword mentions, which false-match in blog posts)
  const hasCookieBanner =
    // Known CMP vendor scripts
    /<script\b[^>]*\bsrc\s*=\s*["'][^"']*(?:cookiebot\.com\/uc\.js|tarteaucitron[^"']*\.js|axeptio_sdk|sdk\.privacy-center\.org|didomi\.io\/loader|onetrust\.com\/(?:scripttemplates|consent)|klaro[^"']*\.js|consentmanager\.net\/delivery|cookie-script\.com)/i.test(html) ||
    // Inline CMP loaders
    /\b(?:OneTrustActiveGroups|OnetrustActiveGroups|Cookiebot|tarteaucitron|window\.axeptioSettings|didomiOnReady|klaroConfig|_paq\.push)\b/.test(html) ||
    // DOM-level banners (id/class)
    /<[^>]+\b(?:id|class)\s*=\s*["'](?:[^"']*\s)?(?:cookie-consent|cookie-banner|cookie-notice|cookieconsent|cc-window|onetrust-banner-sdk|ot-sdk-row|gdpr-cookie|consent-manager-wrapper|didomi-host|axeptio_widget)\b[^"']*["']/i.test(html);

  if (hasTracking && !hasCookieBanner) {
    checks.push({
      id: "rgpd-cookies",
      category: "rgpd",
      name: "Bandeau de consentement cookies",
      status: "fail",
      severity: "high",
      description: "Trackers tiers détectés sans bandeau de consentement cookies. Violation RGPD probable.",
      recommendation: "Implémentez un bandeau de consentement (Tarteaucitron, Axeptio, Cookiebot) avant de charger les trackers.",
    });
  } else if (hasTracking && hasCookieBanner) {
    checks.push({
      id: "rgpd-cookies",
      category: "rgpd",
      name: "Bandeau de consentement cookies",
      status: "pass",
      description: "Bandeau de consentement détecté avec présence de trackers. Vérifiez que le consentement bloque les trackers avant acceptation.",
    });
  } else if (!hasTracking) {
    checks.push({
      id: "rgpd-cookies",
      category: "rgpd",
      name: "Trackers tiers",
      status: "pass",
      description: "Aucun tracker tiers majeur détecté (Google Analytics, Facebook Pixel, Hotjar).",
    });
  }

  // Third-party trackers inventory (URL-based, low FP)
  const trackers: string[] = [];
  if (/google-analytics\.com|\bgtag\s*\(/i.test(html)) trackers.push("Google Analytics");
  if (/googletagmanager\.com\/gtm\.js|\bgtm\.start\b/i.test(html)) trackers.push("Google Tag Manager");
  if (/connect\.facebook\.net|\bfbq\s*\(/i.test(html)) trackers.push("Facebook/Meta Pixel");
  if (/static\.hotjar\.com|script\.hotjar\.com/i.test(html)) trackers.push("Hotjar");
  if (/js\.hs-scripts\.com|js\.hs-analytics\.net/i.test(html)) trackers.push("HubSpot");
  if (/snap\.licdn\.com|linkedin\.com\/px\/|_linkedin_data_partner_id/i.test(html)) trackers.push("LinkedIn Insight");
  if (/analytics\.tiktok\.com/i.test(html)) trackers.push("TikTok Pixel");
  if (/s\.pinimg\.com|pintrk\s*\(/i.test(html)) trackers.push("Pinterest Tag");
  if (/clarity\.ms/i.test(html)) trackers.push("Microsoft Clarity");
  if (/doubleclick\.net|googlesyndication\.com/i.test(html)) trackers.push("Google Ads");

  if (trackers.length > 0) {
    checks.push({
      id: "rgpd-trackers",
      category: "rgpd",
      name: "Inventaire des trackers",
      status: "info",
      description: `${trackers.length} tracker(s) tiers détecté(s).`,
      value: trackers.join(", "),
      recommendation: "Chaque tracker nécessite un consentement explicite avant activation (RGPD Art. 6 & ePrivacy).",
    });
  }

  // Form data collection — info only (already factored into the privacy check above)
  if (collectsPersonalData) {
    const forms = html.match(/<form\b[^>]*>/gi) || [];
    checks.push({
      id: "rgpd-data-collection",
      category: "rgpd",
      name: "Collecte de données personnelles",
      status: "info",
      description: `${forms.length} formulaire(s) détecté(s) collectant des données personnelles (email, nom, téléphone).`,
      recommendation: "Assurez-vous d'informer l'utilisateur de la finalité du traitement et d'obtenir son consentement.",
    });
  }

  return checks;
}

// =============================================================================
// 8. INCIDENT RESPONSE & MONITORING
// =============================================================================

async function checkIncidentResponse(
  baseUrl: string,
  headers: Headers,
  html: string,
  infra: InfraContext,
  soft404: Soft404Detector
): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  const origin = new URL(baseUrl).origin;

  // Error page disclosure — strict signature match (stack traces spécifiques, pas de mots-clés larges)
  const error404 = await safeFetch(`${origin}/this-page-should-not-exist-${Date.now()}`, {
    timeout: 5000,
  });
  if (error404 && error404.status >= 400) {
    const errorHtml = await error404.text().catch(() => "");
    // Signatures spécifiques de framework en debug mode — pas de mots-clés génériques
    const stackTracePatterns = [
      /Traceback \(most recent call last\)/i,
      /\bat\s+[\w$.]+\s*\([^)]*:\d+:\d+\)/, // JS stack trace
      /<div class="traceback"|<pre class="stack-trace"/i,
      /Whoops, there was an error|Symfony\\Component/i,
      /Illuminate\\[A-Za-z]+\\/, // Laravel
      /Werkzeug Debugger|Flask-DebugToolbar/,
      /Django Debug|DEBUG = True/,
      /Fatal error: Uncaught [A-Z]\w*Exception/i,
      /<b>Warning<\/b>:\s+.*?in\s+<b>.*?<\/b>\s+on line\s+<b>\d+<\/b>/i, // PHP warning
      /You have an error in your SQL syntax|ORA-\d{5}/i,
    ];
    const leaksInfo = stackTracePatterns.some((p) => p.test(errorHtml));

    if (leaksInfo) {
      checks.push({
        id: "error-disclosure",
        category: "incident",
        name: "Divulgation d'erreur (Page 404)",
        status: "fail",
        severity: "high",
        description: "La page d'erreur expose des traces techniques (stack trace, erreurs SQL, chemins internes).",
        recommendation: "Configurez des pages d'erreur personnalisées. Désactivez le mode debug en production.",
      });
    } else {
      checks.push({
        id: "error-disclosure",
        category: "incident",
        name: "Divulgation d'erreur (Page 404)",
        status: "pass",
        description: "La page d'erreur ne divulgue pas de traces techniques sensibles.",
      });
    }
  }

  // Debug mode detection — via response headers (canonique) + patterns très spécifiques
  const cleanHtml = stripScriptsStylesComments(html);
  const debugIndicators = [
    headers.get("x-debug-token") !== null,
    headers.get("x-debug-token-link") !== null,
    /<!-- Laravel Debugbar/.test(html),
    /sf-toolbar|symfony-debug-toolbar/i.test(cleanHtml),
    /<div[^>]+id=["']djDebug["']/i.test(cleanHtml), // Django debug toolbar
    /Whoops\\Run/i.test(cleanHtml),
  ];

  const debugFound = debugIndicators.some(Boolean);
  if (debugFound) {
    checks.push({
      id: "debug-mode",
      category: "incident",
      name: "Mode debug",
      status: "fail",
      severity: "critical",
      description: "Des indicateurs de barre de debug ou d'en-têtes de debug sont présents en production.",
      recommendation: "Désactivez IMMÉDIATEMENT le mode debug (APP_DEBUG=false, DEBUG=False, debugbar disabled).",
    });
  } else {
    checks.push({
      id: "debug-mode",
      category: "incident",
      name: "Mode debug",
      status: "pass",
      description: "Aucun indicateur de mode debug détecté.",
    });
  }

  // Backup files exposure — uses shared soft404 detector
  const backupPaths = [
    "/backup.zip", "/backup.tar.gz", "/backup.sql.gz",
    "/db.sql", "/database.sql", "/dump.sql",
    "/site.zip", "/www.zip", "/public.zip",
  ];

  const exposedBackups: string[] = [];
  await Promise.all(
    backupPaths.map(async (path) => {
      const res = await safeFetch(`${origin}${path}`, { method: "GET", timeout: 4000 });
      if (!res?.ok) return;

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html") || contentType.includes("application/xhtml")) return;

      const isBinary = contentType.includes("application/") || contentType.includes("octet-stream");
      const isSql = contentType.includes("text/plain") || contentType.includes("text/sql");
      if (!isBinary && !isSql) return;

      const body = await res.text().catch(() => "");
      if (soft404.isSoft404(body, res.status)) return;

      // Pour .sql : vérifier signature SQL (évite les faux positifs sur texte plain générique)
      if (path.endsWith(".sql") || path.endsWith(".sql.gz")) {
        if (!/^(--|\/\*!)|CREATE TABLE|INSERT INTO|mysqldump/im.test(body.substring(0, 5000))) return;
      }

      exposedBackups.push(path);
    })
  );

  if (exposedBackups.length > 0) {
    checks.push({
      id: "backup-exposure",
      category: "incident",
      name: "Fichiers de sauvegarde exposés",
      status: "fail",
      severity: "critical",
      description: `${exposedBackups.length} fichier(s) de sauvegarde accessible(s) publiquement !`,
      value: exposedBackups.join(", "),
      recommendation: "Supprimez immédiatement ces fichiers du serveur web et bloquez l'accès à ces extensions.",
    });
  }

  // Monitoring headers
  const hasMonitoring =
    headers.get("x-request-id") !== null ||
    headers.get("x-trace-id") !== null ||
    headers.get("x-correlation-id") !== null;

  checks.push({
    id: "monitoring",
    category: "incident",
    name: "Traçabilité des requêtes",
    status: hasMonitoring ? "pass" : "info",
    description: hasMonitoring
      ? "Le serveur inclut des identifiants de requête pour le suivi et le debugging."
      : "Aucun identifiant de requête détecté (X-Request-Id, X-Trace-Id). Utile pour le monitoring.",
    recommendation: !hasMonitoring
      ? "Ajoutez un X-Request-Id unique par requête pour faciliter l'analyse des incidents."
      : undefined,
  });

  // Rate limiting — info si un CDN est détecté (souvent géré en amont sans header public)
  const hasRateLimit =
    headers.get("x-ratelimit-limit") !== null ||
    headers.get("x-rate-limit-limit") !== null ||
    headers.get("retry-after") !== null ||
    headers.get("ratelimit-limit") !== null;

  if (hasRateLimit) {
    checks.push({
      id: "rate-limit",
      category: "incident",
      name: "Limitation de débit (Rate Limiting)",
      status: "pass",
      description: "Des en-têtes de rate limiting sont configurés.",
    });
  } else {
    checks.push({
      id: "rate-limit",
      category: "incident",
      name: "Limitation de débit (Rate Limiting)",
      status: "info",
      description: infra.isManagedHost
        ? `Aucun header de rate limiting en réponse. Votre hébergeur/CDN (${infra.cdn}) peut en appliquer en amont sans l'exposer.`
        : "Aucun en-tête de rate limiting détecté. Utile contre brute-force et DDoS applicatif.",
      recommendation: infra.isManagedHost
        ? undefined
        : "Implémentez un rate limiting (nginx limit_req, Cloudflare, ou au niveau applicatif).",
    });
  }

  // Cache headers — info uniquement (impact perf, pas sécurité)
  const cacheControl = headers.get("cache-control");
  const etag = headers.get("etag");
  checks.push({
    id: "cache-headers",
    category: "incident",
    name: "En-têtes de cache",
    status: cacheControl || etag ? "pass" : "info",
    description:
      cacheControl || etag
        ? `Cache configuré : ${cacheControl || ""} ${etag ? "ETag présent" : ""}`.trim()
        : "Aucun en-tête de cache. Impact perf uniquement, pas sécurité.",
    value: cacheControl || undefined,
    recommendation: !cacheControl
      ? "Configurez Cache-Control pour optimiser les performances (bonne pratique, non sécuritaire)."
      : undefined,
  });

  return checks;
}

// =============================================================================
// 9. XSS & CODE ANALYSIS
// =============================================================================

function checkXSSVectors(html: string): AuditCheck[] {
  const checks: AuditCheck[] = [];

  // Strip scripts/styles/comments to avoid matching inside code/docs
  const cleanHtml = stripScriptsStylesComments(html);
  // Extract inline script bodies for eval/document.write/innerHTML detection
  const scriptBodies = extractScriptContent(html);

  // Inline event handlers — comptés uniquement dans le HTML rendu (pas dans scripts/commentaires)
  const inlineHandlers = cleanHtml.match(/\s(on(?:click|change|submit|load|error|mouseover|focus|blur|input|keyup|keydown|keypress))\s*=\s*["']/gi) || [];
  if (inlineHandlers.length > 15) {
    checks.push({
      id: "inline-handlers",
      category: "xss",
      name: "Event handlers inline",
      status: "info",
      description: `${inlineHandlers.length} gestionnaires d'événements inline détectés (onclick, onload...). Acceptable mais addEventListener() est préférable.`,
      recommendation: "Préférez addEventListener() pour faciliter une future CSP strict.",
    });
  }

  // document.write — uniquement dans les scripts inline
  const docWrite = scriptBodies.match(/\bdocument\.write(?:ln)?\s*\(/g) || [];
  if (docWrite.length > 0) {
    checks.push({
      id: "document-write",
      category: "xss",
      name: "Utilisation de document.write()",
      status: "info",
      description: `${docWrite.length} appel(s) à document.write() détecté(s) dans des scripts inline. Pattern souvent présent via GTM/ads tiers, pas forcément problématique.`,
      recommendation: "Remplacez document.write() par createElement/appendChild dans votre code propre.",
    });
  }

  // innerHTML — info uniquement (usage légitime omniprésent dans les SPAs)
  const innerHTML = scriptBodies.match(/\.innerHTML\s*=/g) || [];
  if (innerHTML.length > 10) {
    checks.push({
      id: "innerhtml",
      category: "xss",
      name: "Assignation innerHTML",
      status: "info",
      description: `${innerHTML.length} assignation(s) innerHTML détectée(s) dans des scripts inline. Assurez-vous que les valeurs dynamiques sont sanitisées.`,
      recommendation: "Utilisez textContent ou DOMPurify pour le contenu utilisateur.",
    });
  }

  // eval — uniquement dans les scripts inline, après stripping des strings
  const scriptNoStrings = scriptBodies
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");
  const evalUsage = scriptNoStrings.match(/(?:^|[^.\w])eval\s*\(/g) || [];
  if (evalUsage.length > 0) {
    checks.push({
      id: "eval-usage",
      category: "xss",
      name: "Utilisation d'eval()",
      status: "warn",
      severity: "medium",
      description: `${evalUsage.length} appel(s) à eval() détecté(s) dans les scripts inline.`,
      recommendation: "Remplacez eval() par JSON.parse() ou des alternatives sûres.",
    });
  }

  // Forms — détection CSRF améliorée (noms de champs, headers SameSite)
  const forms = cleanHtml.match(/<form\b[^>]*>/gi) || [];
  const mutableForms = forms.filter((f) => {
    const methodMatch = f.match(/method\s*=\s*["']?([a-z]+)/i);
    const method = (methodMatch?.[1] || "get").toLowerCase();
    return method !== "get";
  });
  if (mutableForms.length > 0) {
    // Recherche de tokens CSRF dans les inputs hidden ou les meta tags
    const hasCSRFToken =
      /<input\b[^>]*\bname\s*=\s*["'](?:_token|csrf_token|csrfmiddlewaretoken|authenticity_token|__RequestVerificationToken|_csrf)["']/i.test(html) ||
      /<meta\b[^>]*\bname\s*=\s*["']csrf-token["']/i.test(html);
    checks.push({
      id: "csrf",
      category: "xss",
      name: "Protection CSRF",
      status: hasCSRFToken ? "pass" : "info",
      description: hasCSRFToken
        ? `${mutableForms.length} formulaire(s) mutable(s) avec token CSRF détecté.`
        : `${mutableForms.length} formulaire(s) mutable(s) sans token CSRF détectable dans le HTML initial. Peut être géré côté serveur (SameSite cookies, custom headers).`,
      recommendation: !hasCSRFToken
        ? "Vérifiez que CSRF est protégé (token dans header custom, SameSite=Lax/Strict, ou double submit cookie)."
        : undefined,
    });
  }

  // Open redirect — info only (presence of pattern ≠ vuln)
  const redirects = cleanHtml.match(/\bhref\s*=\s*["'][^"']*\?[^"']*(?:\bredirect_to|\breturnUrl|\bcontinue)=/gi) || [];
  if (redirects.length > 0) {
    checks.push({
      id: "open-redirect",
      category: "xss",
      name: "Redirections ouvertes potentielles",
      status: "info",
      description: `${redirects.length} lien(s) avec paramètres de redirection détecté(s). Vérifiez que les URLs cibles sont whitelistées côté serveur.`,
      recommendation: "Validez et whitelist toutes les URLs de redirection côté serveur.",
    });
  }

  return checks;
}

// =============================================================================
// TECHNOLOGY DETECTION
// =============================================================================

function detectTechnologies(headers: Headers, html: string): string[] {
  const techs: string[] = [];
  const server = headers.get("server")?.toLowerCase() || "";
  const poweredBy = headers.get("x-powered-by")?.toLowerCase() || "";
  const lower = html.toLowerCase();

  // Server
  if (server.includes("nginx")) techs.push("Nginx");
  if (server.includes("apache")) techs.push("Apache");
  if (server.includes("cloudflare")) techs.push("Cloudflare");
  if (server.includes("vercel")) techs.push("Vercel");
  if (server.includes("netlify")) techs.push("Netlify");
  if (server.includes("litespeed")) techs.push("LiteSpeed");
  if (server.includes("caddy")) techs.push("Caddy");

  // Powered by
  if (poweredBy.includes("express")) techs.push("Express.js");
  if (poweredBy.includes("php")) techs.push("PHP");
  if (poweredBy.includes("asp.net")) techs.push("ASP.NET");
  if (poweredBy.includes("next.js")) techs.push("Next.js");

  // CMS
  if (lower.includes("wp-content") || lower.includes("wp-includes")) techs.push("WordPress");
  if (lower.includes("joomla")) techs.push("Joomla");
  if (lower.includes("drupal")) techs.push("Drupal");
  if (lower.includes("shopify")) techs.push("Shopify");
  if (lower.includes("wix.com")) techs.push("Wix");
  if (lower.includes("squarespace")) techs.push("Squarespace");
  if (lower.includes("webflow")) techs.push("Webflow");
  if (lower.includes("prestashop")) techs.push("PrestaShop");
  if (lower.includes("magento")) techs.push("Magento");
  if (lower.includes("woocommerce")) techs.push("WooCommerce");

  // Frameworks
  if (lower.includes("__next") || lower.includes("_next/static")) techs.push("Next.js");
  if (lower.includes("__nuxt")) techs.push("Nuxt.js");
  if (lower.includes("gatsby")) techs.push("Gatsby");
  if (lower.includes("react")) techs.push("React");
  if (lower.includes("vue")) techs.push("Vue.js");
  if (lower.includes("angular")) techs.push("Angular");
  if (lower.includes("svelte")) techs.push("Svelte");
  if (lower.includes("laravel")) techs.push("Laravel");
  if (lower.includes("symfony")) techs.push("Symfony");
  if (lower.includes("django")) techs.push("Django");
  if (lower.includes("ruby on rails") || lower.includes("turbolinks")) techs.push("Ruby on Rails");

  // Libraries
  if (lower.includes("jquery")) techs.push("jQuery");
  if (lower.includes("bootstrap")) techs.push("Bootstrap");
  if (lower.includes("tailwindcss") || lower.includes("tailwind")) techs.push("Tailwind CSS");
  if (lower.includes("alpine")) techs.push("Alpine.js");
  if (lower.includes("framer-motion")) techs.push("Framer Motion");

  // Analytics & tracking
  if (lower.includes("google-analytics") || lower.includes("gtag")) techs.push("Google Analytics");
  if (lower.includes("gtm.js") || lower.includes("googletagmanager")) techs.push("Google Tag Manager");
  if (lower.includes("recaptcha")) techs.push("reCAPTCHA");
  if (lower.includes("stripe")) techs.push("Stripe");
  if (lower.includes("hotjar")) techs.push("Hotjar");
  if (lower.includes("intercom")) techs.push("Intercom");
  if (lower.includes("crisp")) techs.push("Crisp");
  if (lower.includes("hubspot")) techs.push("HubSpot");
  if (lower.includes("matomo") || lower.includes("piwik")) techs.push("Matomo");
  if (lower.includes("plausible")) techs.push("Plausible");
  if (lower.includes("umami")) techs.push("Umami");
  if (lower.includes("clarity.ms")) techs.push("Microsoft Clarity");

  // WordPress deep scan
  if (techs.includes("WordPress")) {
    const wpVersion = html.match(/content="WordPress\s+([\d.]+)"/i);
    if (wpVersion) techs.push(`WP v${wpVersion[1]}`);

    const plugins = html.match(/wp-content\/plugins\/([^/'"]+)/g);
    if (plugins) {
      const unique = [...new Set(plugins.map((p) => p.split("/plugins/")[1]))];
      unique.slice(0, 15).forEach((p) => techs.push(`Plugin: ${p}`));
    }

    const theme = html.match(/wp-content\/themes\/([^/'"]+)/);
    if (theme) techs.push(`Thème: ${theme[1]}`);
  }

  return [...new Set(techs)];
}

// =============================================================================
// 10. WORDPRESS-SPECIFIC SECURITY CHECKS
// =============================================================================

// Canonical CMS detection — require structural markers, not just keyword mentions
function isCanonicalWordPress(html: string): boolean {
  return (
    /<link\b[^>]+\brel\s*=\s*["']https:\/\/api\.w\.org\/["']/i.test(html) ||
    /<meta\b[^>]+\bname\s*=\s*["']generator["'][^>]*content\s*=\s*["']WordPress\b/i.test(html) ||
    /["'][^"']*\/wp-content\/(?:themes|plugins|uploads)\//.test(html) ||
    /["'][^"']*\/wp-includes\/(?:js|css)\//.test(html) ||
    /wp-emoji-release\.min\.js/.test(html)
  );
}

function isCanonicalJoomla(html: string): boolean {
  return (
    /<meta\b[^>]+\bname\s*=\s*["']generator["'][^>]*content\s*=\s*["']Joomla!/i.test(html) ||
    /["'][^"']*\/media\/(?:jui|system)\/(?:js|css)\//.test(html) ||
    /\bvar\s+Joomla\s*=|window\.Joomla\s*=/.test(html) ||
    /joomla-script-options/.test(html)
  );
}

function isCanonicalDrupal(html: string): boolean {
  return (
    /<meta\b[^>]+\bname\s*=\s*["']generator["'][^>]*content\s*=\s*["']Drupal\b/i.test(html) ||
    /\b(?:drupalSettings|Drupal\.settings|Drupal\.behaviors)\b/.test(html) ||
    /["'][^"']*\/sites\/(?:default|all)\/(?:files|modules|themes)\//.test(html) ||
    /<body\b[^>]+\bclass\s*=\s*["'][^"']*\bpath-frontpage\b[^"']*\bpage-node-\d+\b/.test(html)
  );
}

function isCanonicalPrestaShop(html: string): boolean {
  return (
    /<meta\b[^>]+\bname\s*=\s*["']generator["'][^>]*content\s*=\s*["']PrestaShop/i.test(html) ||
    /\bvar\s+prestashop\s*=\s*\{|window\.prestashop\s*=/.test(html) ||
    /["'][^"']*\/themes\/[^"']+\/assets\/cache\/theme-[0-9a-f]+\.css/.test(html)
  );
}

async function checkWordPress(baseUrl: string, html: string): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  const origin = new URL(baseUrl).origin;

  // Only run if WordPress is canonically detected
  if (!isCanonicalWordPress(html)) return checks;

  checks.push({
    id: "wp-detected",
    category: "wordpress",
    name: "WordPress détecté",
    status: "info",
    description: "Ce site utilise WordPress. Des vérifications spécifiques vont être effectuées.",
  });

  // ── WordPress Version Exposure ──
  const wpVersionMeta = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']WordPress\s+([\d.]+)["']/i);
  const wpVersion = wpVersionMeta?.[1];

  checks.push({
    id: "wp-version",
    category: "wordpress",
    name: "Version WordPress exposée",
    status: wpVersion ? "warn" : "pass",
    severity: wpVersion ? "low" : undefined,
    description: wpVersion
      ? `WordPress ${wpVersion} détecté dans la balise meta generator.`
      : "La version WordPress n'est pas exposée dans le code source.",
    value: wpVersion || undefined,
    recommendation: wpVersion
      ? `Masquez la version WordPress :\n\n// functions.php\nremove_action('wp_head', 'wp_generator');\nadd_filter('the_generator', '__return_empty_string');`
      : undefined,
  });

  // ── readme.html ── (validation stricte : doit vraiment être le readme WP)
  const readmeRes = await safeFetch(`${origin}/readme.html`, { timeout: 3000 });
  if (readmeRes?.ok) {
    const readmeBody = await readmeRes.text().catch(() => "");
    const contentType = readmeRes.headers.get("content-type") || "";
    const isRealReadme =
      contentType.includes("text/html") &&
      /<h1[^>]*>\s*<[^>]*>?\s*WordPress/i.test(readmeBody) &&
      /Version\s+[\d.]+/i.test(readmeBody);
    if (isRealReadme) {
      checks.push({
        id: "wp-readme",
        category: "wordpress",
        name: "readme.html accessible",
        status: "info",
        description: "Le fichier readme.html WordPress est accessible. Impact réel faible (la version peut aussi être inférée autrement).",
        value: `${origin}/readme.html`,
        recommendation: `Bloquez l'accès si souhaité :\n\n# .htaccess\n<Files readme.html>\n  Order Allow,Deny\n  Deny from all\n</Files>`,
      });
    }
  }

  // ── XML-RPC ── (vérifier que c'est vraiment la réponse XML-RPC)
  const xmlrpcRes = await safeFetch(`${origin}/xmlrpc.php`, { method: "POST", timeout: 3000 });
  if (xmlrpcRes) {
    const xmlrpcBody = await xmlrpcRes.text().catch(() => "");
    const contentType = xmlrpcRes.headers.get("content-type") || "";
    const isRealXmlRpc =
      (xmlrpcRes.status === 200 || xmlrpcRes.status === 405) &&
      !contentType.includes("text/html") &&
      /XML-RPC server accepts POST requests only|<methodResponse>|<methodCall>/i.test(xmlrpcBody);
    if (isRealXmlRpc) {
      checks.push({
        id: "wp-xmlrpc",
        category: "wordpress",
        name: "XML-RPC actif",
        status: "warn",
        severity: "medium",
        description: "XML-RPC est accessible. Vecteur historique de brute-force et pingback abuse. Fail2ban/Cloudflare mitigent souvent ce risque.",
        value: `${origin}/xmlrpc.php`,
        recommendation: `Désactivez XML-RPC :\n\n// functions.php\nadd_filter('xmlrpc_enabled', '__return_false');\n\n# .htaccess\n<Files xmlrpc.php>\n  Order Allow,Deny\n  Deny from all\n</Files>\n\n# Ou mieux : plugin "Disable XML-RPC"`,
      });
    }
  }

  // ── Author Enumeration (?author=1) ── (seulement si la redirection expose un slug)
  const authorRes = await safeFetch(`${origin}/?author=1`, { method: "GET", redirect: "manual", timeout: 3000 });
  if (authorRes) {
    const location = authorRes.headers.get("location") || "";
    const authorMatch = location.match(/\/author\/([^/?#]+)/i);
    const exposesAuthor =
      authorRes.status >= 300 &&
      authorRes.status < 400 &&
      authorMatch !== null;
    if (exposesAuthor && authorMatch) {
      checks.push({
        id: "wp-author-enum",
        category: "wordpress",
        name: "Énumération des auteurs",
        status: "warn",
        severity: "low",
        description: `L'énumération des auteurs est possible (auteur: ${authorMatch[1]}).`,
        value: `${origin}/?author=1 → ${location}`,
        recommendation: `Bloquez l'énumération :\n\n# .htaccess\nRewriteEngine On\nRewriteCond %{QUERY_STRING} ^author=([0-9]*)\nRewriteRule .* - [F]`,
      });
    }
  }

  // ── REST API Users Endpoint ── (validation stricte JSON + array non vide)
  const restUsersRes = await safeFetch(`${origin}/wp-json/wp/v2/users`, { timeout: 3000 });
  if (restUsersRes?.ok) {
    const contentType = restUsersRes.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const usersBody = await restUsersRes.text().catch(() => "");
      try {
        const users = JSON.parse(usersBody);
        if (Array.isArray(users) && users.length > 0 && users.every((u) => typeof u === "object" && u && "slug" in u)) {
          const slugs = users.map((u: { slug: string }) => u.slug).filter(Boolean).slice(0, 5);
          if (slugs.length > 0) {
            checks.push({
              id: "wp-rest-users",
              category: "wordpress",
              name: "API REST — Utilisateurs exposés",
              status: "warn",
              severity: "medium",
              description: `L'API REST WordPress expose ${slugs.length} utilisateur(s) publiquement : ${slugs.join(", ")}`,
              value: `${origin}/wp-json/wp/v2/users`,
              recommendation: `Bloquez /wp-json/wp/v2/users aux non-authentifiés :\n\n// functions.php\nadd_filter('rest_endpoints', function($endpoints) {\n  if (isset($endpoints['/wp/v2/users'])) unset($endpoints['/wp/v2/users']);\n  if (isset($endpoints['/wp/v2/users/(?P<id>[\\\\d]+)'])) unset($endpoints['/wp/v2/users/(?P<id>[\\\\d]+)']);\n  return $endpoints;\n});`,
            });
          }
        }
      } catch {
        // Not valid JSON
      }
    }
  }

  // ── REST API open (/wp-json/) ──
  const restRes = await safeFetch(`${origin}/wp-json/`, { timeout: 3000 });
  if (restRes?.ok) {
    const restBody = await restRes.text().catch(() => "");
    if (restBody.includes("namespaces") && restBody.includes("wp/v2")) {
      checks.push({
        id: "wp-rest-api",
        category: "wordpress",
        name: "API REST ouverte",
        status: "info",
        description: "L'API REST WordPress est accessible. Vérifiez que seuls les endpoints nécessaires sont exposés.",
        value: `${origin}/wp-json/`,
        recommendation: `Restreignez les endpoints sensibles. Désactivez les routes inutiles :\n\nadd_filter('rest_endpoints', function($endpoints) {\n  unset($endpoints['/wp/v2/users']);\n  unset($endpoints['/wp/v2/users/(?P<id>[\\\\d]+)']);\n  return $endpoints;\n});`,
      });
    }
  }

  // ── debug.log exposure ── (validation stricte : signatures de log PHP réelles)
  const debugLogPaths = ["/wp-content/debug.log", "/debug.log"];
  for (const path of debugLogPaths) {
    const debugRes = await safeFetch(`${origin}${path}`, { timeout: 3000 });
    if (debugRes?.ok) {
      const debugBody = await debugRes.text().catch(() => "");
      const contentType = debugRes.headers.get("content-type") || "";
      // Must be text/plain AND contain real PHP error log signatures
      const isRealLog =
        !contentType.includes("text/html") &&
        (
          /\[\d{2}-[A-Z][a-z]{2}-\d{4}\s+\d{2}:\d{2}:\d{2}\s+UTC\]\s+PHP\s+(Notice|Warning|Fatal error|Parse error)/i.test(debugBody) ||
          /PHP Stack trace:/i.test(debugBody)
        );
      if (isRealLog) {
        checks.push({
          id: "wp-debug-log",
          category: "wordpress",
          name: "debug.log exposé",
          status: "fail",
          severity: "critical",
          description: `Le fichier ${path} est accessible publiquement et contient des logs PHP. Fuite de chemins serveur et potentiellement de données sensibles.`,
          value: `${origin}${path}`,
          recommendation: `Bloquez immédiatement l'accès :\n\n# .htaccess\n<Files debug.log>\n  Order Allow,Deny\n  Deny from all\n</Files>\n\n// wp-config.php\ndefine('WP_DEBUG', false);\ndefine('WP_DEBUG_LOG', false);`,
        });
        break;
      }
    }
  }

  // ── wp-config.php backup files ──
  const wpConfigBackups = ["/wp-config.php.bak", "/wp-config.php.old", "/wp-config.php~", "/wp-config.php.save", "/wp-config.txt"];
  const wpConfigResults = await Promise.all(
    wpConfigBackups.map(async (path) => {
      const res = await safeFetch(`${origin}${path}`, { timeout: 3000 });
      if (res?.ok) {
        const body = await res.text().catch(() => "");
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("text/html") && (body.includes("DB_NAME") || body.includes("DB_PASSWORD") || body.includes("table_prefix"))) {
          return path;
        }
      }
      return null;
    })
  );
  const exposedConfigs = wpConfigResults.filter(Boolean);
  if (exposedConfigs.length > 0) {
    checks.push({
      id: "wp-config-backup",
      category: "wordpress",
      name: "Backup wp-config.php exposé",
      status: "fail",
      severity: "critical",
      description: `Fichier(s) de backup wp-config.php accessible(s) ! Contient les identifiants de base de données.`,
      value: exposedConfigs.join(", "),
      recommendation: `Supprimez ces fichiers IMMÉDIATEMENT et bloquez l'accès :\n\n# .htaccess\n<FilesMatch "wp-config\\.php.*">\n  Order Allow,Deny\n  Deny from all\n</FilesMatch>`,
    });
  }

  // ── Login page accessibility ── (info only — c'est normal que ce soit accessible)
  const loginRes = await safeFetch(`${origin}/wp-login.php`, { method: "GET", redirect: "follow", timeout: 5000 });
  if (loginRes?.ok) {
    const loginBody = await loginRes.text().catch(() => "");
    if (/<form\s[^>]*name=["']loginform["']|name="log"[^>]*>[\s\S]{0,500}name="pwd"/i.test(loginBody)) {
      checks.push({
        id: "wp-login",
        category: "wordpress",
        name: "Page de connexion WordPress",
        status: "info",
        description: "wp-login.php est accessible à l'URL par défaut (comportement normal de WordPress). Pour réduire la surface d'attaque brute-force, un masquage d'URL et un rate-limit sont recommandés.",
        value: `${origin}/wp-login.php`,
        recommendation: `Bonnes pratiques optionnelles :\n\n1. Masquer l'URL : plugin "WPS Hide Login"\n2. Limiter les tentatives : plugin "Limit Login Attempts Reloaded"\n3. Captcha : reCaptcha\n4. IP whitelisting via .htaccess si admin unique`,
      });
    }
  }

  // ── Plugins & Theme Version Detection with CVE references ──
  const pluginMatches = html.match(/wp-content\/plugins\/([^/'"?]+)(?:\/[^'"?]*?ver(?:sion)?[=:]\s*([\d.]+))?/gi) || [];
  // Theme detection (for informational purposes)

  // Extract unique plugins with versions
  const detectedPlugins: { name: string; version?: string }[] = [];
  const pluginNames = new Set<string>();
  for (const match of pluginMatches) {
    const parts = match.match(/plugins\/([^/'"?]+)/i);
    if (parts?.[1] && !pluginNames.has(parts[1])) {
      pluginNames.add(parts[1]);
      const verMatch = match.match(/ver(?:sion)?[=:]\s*([\d.]+)/i);
      detectedPlugins.push({ name: parts[1], version: verMatch?.[1] });
    }
  }

  // Known vulnerable plugins/versions (common CVEs)
  const knownVulnerable: Record<string, { maxSafe: string; cve: string; desc: string }[]> = {
    "contact-form-7": [{ maxSafe: "5.3.2", cve: "CVE-2020-35489", desc: "Unrestricted file upload" }],
    "elementor": [{ maxSafe: "3.6.3", cve: "CVE-2022-29455", desc: "Reflected XSS" }],
    "wp-file-manager": [{ maxSafe: "6.8", cve: "CVE-2020-25213", desc: "Remote code execution" }],
    "nextgen-gallery": [{ maxSafe: "3.5.0", cve: "CVE-2020-35942", desc: "CSRF + RCE" }],
    "really-simple-ssl": [{ maxSafe: "9.0.0", cve: "CVE-2023-49583", desc: "Authentication bypass" }],
    "all-in-one-seo-pack": [{ maxSafe: "4.1.5.3", cve: "CVE-2021-25036", desc: "Authenticated SQL Injection" }],
    "wpforms-lite": [{ maxSafe: "1.6.7.1", cve: "CVE-2022-0764", desc: "Stored XSS" }],
    "yoast-seo": [{ maxSafe: "15.4", cve: "CVE-2021-25118", desc: "Authenticated Stored XSS" }],
    "wordfence": [{ maxSafe: "7.5.8", cve: "CVE-2022-0135", desc: "Authenticated Stored XSS" }],
    "updraftplus": [{ maxSafe: "1.22.3", cve: "CVE-2022-0633", desc: "Backup disclosure" }],
    "duplicator": [{ maxSafe: "1.3.26", cve: "CVE-2020-11738", desc: "Arbitrary file download" }],
    "revslider": [{ maxSafe: "4.2", cve: "CVE-2014-9734", desc: "Arbitrary file download" }],
    "wp-super-cache": [{ maxSafe: "1.7.3", cve: "CVE-2021-24209", desc: "Authenticated RCE" }],
    "woocommerce": [{ maxSafe: "5.5.0", cve: "CVE-2021-32789", desc: "SQL Injection" }],
    "jetpack": [{ maxSafe: "9.8", cve: "CVE-2021-24374", desc: "Information Disclosure" }],
  };

  function versionCompare(a: string, b: string): number {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }

  const vulnerableFound: string[] = [];
  for (const plugin of detectedPlugins) {
    const vulns = knownVulnerable[plugin.name];
    if (vulns && plugin.version) {
      for (const vuln of vulns) {
        if (versionCompare(plugin.version, vuln.maxSafe) <= 0) {
          vulnerableFound.push(`${plugin.name} v${plugin.version} (${vuln.cve}: ${vuln.desc})`);
        }
      }
    }
  }

  if (detectedPlugins.length > 0) {
    checks.push({
      id: "wp-plugins",
      category: "wordpress",
      name: "Plugins détectés",
      status: vulnerableFound.length > 0 ? "fail" : "info",
      severity: vulnerableFound.length > 0 ? "high" : undefined,
      description: vulnerableFound.length > 0
        ? `${detectedPlugins.length} plugin(s) détecté(s), dont ${vulnerableFound.length} potentiellement vulnérable(s).`
        : `${detectedPlugins.length} plugin(s) détecté(s). Aucune vulnérabilité connue identifiée.`,
      value: vulnerableFound.length > 0
        ? vulnerableFound.join("\n")
        : detectedPlugins.map((p) => `${p.name}${p.version ? ` v${p.version}` : ""}`).join(", "),
      recommendation: vulnerableFound.length > 0
        ? "Mettez à jour immédiatement les plugins vulnérables. Utilisez WPScan pour un scan complet : wpscan --url votre-site.com"
        : "Maintenez tous les plugins à jour. Supprimez les plugins inactifs.",
    });
  }

  // ── Overall WP Security Summary ──
  const wpFails = checks.filter((c) => c.status === "fail").length;
  const wpWarns = checks.filter((c) => c.status === "warn").length;
  if (wpFails === 0 && wpWarns === 0) {
    checks.push({
      id: "wp-summary",
      category: "wordpress",
      name: "Résumé WordPress",
      status: "pass",
      description: "Aucune vulnérabilité WordPress spécifique détectée. Bon niveau de sécurisation.",
    });
  }

  return checks;
}

// Fallback CMS versions — used if the live lookup fails. The live values are
// fetched at request time via preloadLatestVersions() and overwrite these.
let KNOWN_LATEST_VERSIONS: Record<string, string> = {
  WordPress: "6.8",
  Joomla: "5.3",
  Drupal: "11.2",
  PrestaShop: "9.0",
  Magento: "2.4.7",
  TYPO3: "13.4",
};

function secVersionCompare(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

// Classifies how far behind a version is: "major" (≥1 major behind), "minor" (≥1 minor behind), "current" (same or ahead).
// Used to calibrate severity — a slightly stale version is not "critical".
function versionGap(current: string, latest: string): "major" | "minor" | "current" {
  const [curMajor = 0, curMinor = 0] = current.split(".").map(Number);
  const [latMajor = 0, latMinor = 0] = latest.split(".").map(Number);
  if (curMajor < latMajor) return "major";
  if (curMajor === latMajor && curMinor < latMinor) return "minor";
  return "current";
}

// Detect CMS info for the result (uses canonical markers, not keyword includes)
function detectCMSInfo(html: string): CMSInfo | null {
  // WordPress
  if (isCanonicalWordPress(html)) {
    const versionMeta = html.match(/content="WordPress\s+([\d.]+)"/i);
    const versionGen = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["'][^"']*WordPress\s+([\d.]+)/i);
    const version = versionMeta?.[1] || versionGen?.[1] || null;

    const themeMatch = html.match(/wp-content\/themes\/([^/'"?]+)/i);
    const themeVer = themeMatch
      ? html.match(new RegExp(`wp-content/themes/${themeMatch[1]}[^'"]*[?&]ver(?:sion)?=([\\.\\d]+)`, "i"))
      : null;
    const theme = themeMatch ? { name: themeMatch[1], version: themeVer?.[1] } : null;

    const pluginMatches = html.match(/wp-content\/plugins\/([^/'"?]+)/gi) || [];
    const pluginNames = new Set<string>();
    const plugins: { name: string; version?: string }[] = [];
    for (const m of pluginMatches) {
      const name = m.match(/plugins\/([^/'"?]+)/i)?.[1];
      if (name && !pluginNames.has(name)) {
        pluginNames.add(name);
        const verMatch = html.match(new RegExp(`wp-content/plugins/${name}[^'"]*[?&]ver(?:sion)?=([\\.\\d]+)`, "i"));
        plugins.push({ name, version: verMatch?.[1] });
      }
    }

    const isOutdated = version ? secVersionCompare(version, KNOWN_LATEST_VERSIONS.WordPress) < 0 : null;
    return { name: "WordPress", version, isOutdated, theme, plugins };
  }

  // Joomla
  if (isCanonicalJoomla(html)) {
    const gen = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']Joomla!\s*([\d.]*)/i);
    const version = gen?.[1] || null;
    const templateMatch = html.match(/\/templates\/([^/'"?]+)/i);
    const theme = templateMatch ? { name: templateMatch[1] } : null;
    const modMatches = html.match(/\/(?:modules|plugins|components)\/(?:mod_|plg_|com_)([^/'"?]+)/gi) || [];
    const modNames = new Set<string>();
    const plugins: { name: string; version?: string }[] = [];
    for (const m of modMatches) {
      const name = m.match(/(?:mod_|plg_|com_)([^/'"?]+)/i)?.[1];
      if (name && !modNames.has(name)) { modNames.add(name); plugins.push({ name }); }
    }
    const isOutdated = version ? secVersionCompare(version, KNOWN_LATEST_VERSIONS.Joomla) < 0 : null;
    return { name: "Joomla", version, isOutdated, theme, plugins };
  }

  // Drupal
  if (isCanonicalDrupal(html)) {
    const gen = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']Drupal\s*([\d.]*)/i);
    const version = gen?.[1] || null;
    const themeMatch = html.match(/\/themes\/(?:custom\/|contrib\/)?([^/'"?]+)/i);
    const theme = themeMatch ? { name: themeMatch[1] } : null;
    const modMatches = html.match(/\/modules\/(?:custom\/|contrib\/)?([^/'"?]+)/gi) || [];
    const modNames = new Set<string>();
    const plugins: { name: string; version?: string }[] = [];
    for (const m of modMatches) {
      const name = m.match(/\/([^/'"?]+)$/i)?.[1];
      if (name && !modNames.has(name)) { modNames.add(name); plugins.push({ name }); }
    }
    const isOutdated = version ? secVersionCompare(version, KNOWN_LATEST_VERSIONS.Drupal) < 0 : null;
    return { name: "Drupal", version, isOutdated, theme, plugins };
  }

  // PrestaShop
  if (isCanonicalPrestaShop(html)) {
    const gen = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']PrestaShop\s*([\d.]*)/i);
    const version = gen?.[1] || null;
    const themeMatch = html.match(/\/themes\/([^/'"?]+)/i);
    const theme = themeMatch ? { name: themeMatch[1] } : null;
    const modMatches = html.match(/\/modules\/([^/'"?]+)/gi) || [];
    const modNames = new Set<string>();
    const plugins: { name: string; version?: string }[] = [];
    for (const m of modMatches) {
      const name = m.match(/\/modules\/([^/'"?]+)/i)?.[1];
      if (name && !modNames.has(name)) { modNames.add(name); plugins.push({ name }); }
    }
    const isOutdated = version ? secVersionCompare(version, KNOWN_LATEST_VERSIONS.PrestaShop) < 0 : null;
    return { name: "PrestaShop", version, isOutdated, theme, plugins };
  }

  // Shopify — require canonical markers
  if (/cdn\.shopify\.com|Shopify\.shop\s*=|Shopify\.theme\s*=|window\.Shopify\s*=/.test(html)) {
    const themeMatch = html.match(/Shopify\.theme\s*=\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i);
    const theme = themeMatch ? { name: themeMatch[1] } : null;
    return { name: "Shopify", version: null, isOutdated: null, theme, plugins: [] };
  }

  // Wix / Squarespace / Webflow — canonical markers
  if (/<meta[^>]+name=["']generator["'][^>]*content=["']Wix\.com|static\.wixstatic\.com|_wixCssModules/i.test(html)) {
    return { name: "Wix", version: null, isOutdated: null, theme: null, plugins: [] };
  }
  if (/static\d?\.squarespace\.com|<!--\s*This is Squarespace\./i.test(html)) {
    return { name: "Squarespace", version: null, isOutdated: null, theme: null, plugins: [] };
  }
  if (/<html[^>]+\bdata-wf-(?:site|page)=|assets\.website-files\.com/.test(html)) {
    return { name: "Webflow", version: null, isOutdated: null, theme: null, plugins: [] };
  }

  // Magento — require canonical markers
  if (/<meta[^>]+name=["']generator["'][^>]*content=["']Magento|\bMage\.Cookies\b|require\.config.*?mage\/|Magento_\w+/i.test(html)) {
    const v = html.match(/Magento\/([\d.]+)/i);
    const version = v?.[1] || null;
    const isOutdated = version ? secVersionCompare(version, KNOWN_LATEST_VERSIONS.Magento) < 0 : null;
    return { name: "Magento", version, isOutdated, theme: null, plugins: [] };
  }

  return null;
}

// =============================================================================
// 11. JOOMLA-SPECIFIC SECURITY CHECKS
// =============================================================================

async function checkJoomla(baseUrl: string, html: string): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  const origin = new URL(baseUrl).origin;

  if (!isCanonicalJoomla(html)) return checks;

  checks.push({
    id: "joomla-detected",
    category: "cms",
    name: "Joomla détecté",
    status: "info",
    description: "Ce site utilise Joomla. Des vérifications spécifiques vont être effectuées.",
  });

  // Version exposure
  const joomlaGen = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']Joomla!\s*([\d.]*)/i);
  if (joomlaGen?.[1]) {
    checks.push({
      id: "joomla-version",
      category: "cms",
      name: "Version Joomla exposée",
      status: "fail",
      severity: "high",
      description: `Joomla ${joomlaGen[1]} détecté via la balise generator. Les attaquants ciblent les versions connues.`,
      value: `Joomla ${joomlaGen[1]}`,
      recommendation: "Supprimez la balise generator dans les paramètres globaux de Joomla ou via un plugin de sécurité.",
    });

    const joomlaGap = versionGap(joomlaGen[1], KNOWN_LATEST_VERSIONS.Joomla);
    if (joomlaGap !== "current") {
      checks.push({
        id: "joomla-outdated",
        category: "cms",
        name: `Joomla ${joomlaGap === "major" ? "majeure obsolète" : "légèrement obsolète"}`,
        status: joomlaGap === "major" ? "fail" : "warn",
        severity: joomlaGap === "major" ? "high" : "low",
        description: `Joomla ${joomlaGen[1]} — dernière version connue : ${KNOWN_LATEST_VERSIONS.Joomla}.`,
        recommendation: "Mettez à jour Joomla vers la dernière version.",
      });
    }
  }

  // Administrator page
  const adminRes = await safeFetch(`${origin}/administrator/`, { method: "GET", redirect: "follow", timeout: 3000 });
  if (adminRes?.ok) {
    const adminBody = await adminRes.text().catch(() => "");
    if (/joomla|com_login/i.test(adminBody)) {
      checks.push({
        id: "joomla-admin",
        category: "cms",
        name: "Page d'administration Joomla accessible",
        status: "warn",
        severity: "medium",
        description: "La page /administrator/ est accessible. Cible privilégiée pour les attaques brute-force.",
        value: `${origin}/administrator/`,
        recommendation: "Protégez la page d'administration avec un plugin (AdminExile, jSecure) ou un .htaccess/IP whitelist.",
      });
    }
  }

  // configuration.php.bak
  const configBackups = ["/configuration.php.bak", "/configuration.php.old", "/configuration.php~"];
  for (const path of configBackups) {
    const res = await safeFetch(`${origin}${path}`, { timeout: 3000 });
    if (res?.ok) {
      const body = await res.text().catch(() => "");
      if (body.includes("JConfig") || body.includes("$host") || body.includes("$db")) {
        checks.push({
          id: "joomla-config-backup",
          category: "cms",
          name: "Backup configuration.php exposé",
          status: "fail",
          severity: "critical",
          description: `Le fichier ${path} est accessible. Il contient les identifiants de la base de données.`,
          value: `${origin}${path}`,
          recommendation: "Supprimez ce fichier immédiatement et bloquez l'accès via .htaccess.",
        });
        break;
      }
    }
  }

  return checks;
}

// =============================================================================
// 12. DRUPAL-SPECIFIC SECURITY CHECKS
// =============================================================================

async function checkDrupal(baseUrl: string, html: string): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  const origin = new URL(baseUrl).origin;

  if (!isCanonicalDrupal(html)) return checks;

  checks.push({
    id: "drupal-detected",
    category: "cms",
    name: "Drupal détecté",
    status: "info",
    description: "Ce site utilise Drupal. Des vérifications spécifiques vont être effectuées.",
  });

  // Version exposure
  const drupalGen = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']Drupal\s*([\d.]*)/i);
  if (drupalGen?.[1]) {
    checks.push({
      id: "drupal-version",
      category: "cms",
      name: "Version Drupal exposée",
      status: "fail",
      severity: "high",
      description: `Drupal ${drupalGen[1]} détecté via la balise generator.`,
      value: `Drupal ${drupalGen[1]}`,
      recommendation: "Supprimez la balise generator via le module de sécurité ou dans le template.",
    });

    const drupalGap = versionGap(drupalGen[1], KNOWN_LATEST_VERSIONS.Drupal);
    if (drupalGap !== "current") {
      checks.push({
        id: "drupal-outdated",
        category: "cms",
        name: `Drupal ${drupalGap === "major" ? "majeure obsolète" : "légèrement obsolète"}`,
        status: drupalGap === "major" ? "fail" : "warn",
        severity: drupalGap === "major" ? "high" : "low",
        description: `Drupal ${drupalGen[1]} — dernière version connue : ${KNOWN_LATEST_VERSIONS.Drupal}.`,
        recommendation: "Mettez à jour Drupal vers la dernière version. Les branches non-LTS sans correctifs sont vulnérables (Drupalgeddon…).",
      });
    }
  }

  // CHANGELOG.txt
  const changelogRes = await safeFetch(`${origin}/CHANGELOG.txt`, { timeout: 3000 });
  if (changelogRes?.ok) {
    const body = await changelogRes.text().catch(() => "");
    if (/drupal/i.test(body)) {
      checks.push({
        id: "drupal-changelog",
        category: "cms",
        name: "CHANGELOG.txt accessible",
        status: "warn",
        severity: "medium",
        description: "Le fichier CHANGELOG.txt est accessible. Il révèle la version exacte de Drupal.",
        value: `${origin}/CHANGELOG.txt`,
        recommendation: "Supprimez ou bloquez l'accès au fichier CHANGELOG.txt.",
      });
    }
  }

  // user/login
  const loginRes = await safeFetch(`${origin}/user/login`, { method: "GET", redirect: "follow", timeout: 3000 });
  if (loginRes?.ok) {
    const loginBody = await loginRes.text().catch(() => "");
    if (/name="name"[\s\S]*name="pass"|drupal/i.test(loginBody)) {
      checks.push({
        id: "drupal-login",
        category: "cms",
        name: "Page de connexion Drupal accessible",
        status: "warn",
        severity: "medium",
        description: "La page /user/login est accessible à l'URL par défaut.",
        value: `${origin}/user/login`,
        recommendation: "Renommez l'URL de connexion avec le module 'Rename Admin Paths' et limitez les tentatives de connexion.",
      });
    }
  }

  return checks;
}

// =============================================================================
// 13. PRESTASHOP-SPECIFIC SECURITY CHECKS
// =============================================================================

async function checkPrestaShop(baseUrl: string, html: string): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  const origin = new URL(baseUrl).origin;

  if (!isCanonicalPrestaShop(html)) return checks;

  checks.push({
    id: "prestashop-detected",
    category: "cms",
    name: "PrestaShop détecté",
    status: "info",
    description: "Ce site utilise PrestaShop. Des vérifications spécifiques vont être effectuées.",
  });

  // Version exposure
  const psGen = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']PrestaShop\s*([\d.]*)/i);
  if (psGen?.[1]) {
    checks.push({
      id: "prestashop-version",
      category: "cms",
      name: "Version PrestaShop exposée",
      status: "fail",
      severity: "high",
      description: `PrestaShop ${psGen[1]} détecté via la balise generator.`,
      value: `PrestaShop ${psGen[1]}`,
      recommendation: "Masquez la balise generator dans les paramètres PrestaShop ou via le template.",
    });

    const psGap = versionGap(psGen[1], KNOWN_LATEST_VERSIONS.PrestaShop);
    if (psGap !== "current") {
      checks.push({
        id: "prestashop-outdated",
        category: "cms",
        name: `PrestaShop ${psGap === "major" ? "majeure obsolète" : "légèrement obsolète"}`,
        status: psGap === "major" ? "fail" : "warn",
        severity: psGap === "major" ? "high" : "low",
        description: `PrestaShop ${psGen[1]} — dernière version connue : ${KNOWN_LATEST_VERSIONS.PrestaShop}.`,
        recommendation: "Mettez à jour PrestaShop vers la dernière version.",
      });
    }
  }

  // Admin panel (common default paths)
  for (const adminPath of ["/admin", "/admin1", "/backoffice"]) {
    const res = await safeFetch(`${origin}${adminPath}`, { method: "GET", redirect: "follow", timeout: 3000 });
    if (res?.ok) {
      const body = await res.text().catch(() => "");
      if (/prestashop|admincontroller/i.test(body)) {
        checks.push({
          id: "prestashop-admin",
          category: "cms",
          name: "Back-office PrestaShop accessible",
          status: "warn",
          severity: "medium",
          description: `Le back-office est accessible à ${adminPath}. Renommez le dossier d'administration.`,
          value: `${origin}${adminPath}`,
          recommendation: "Renommez le dossier d'administration avec un nom unique et non devinable.",
        });
        break;
      }
    }
  }

  return checks;
}

// =============================================================================
// CMS VERSION CHECK (generic for all CMS)
// =============================================================================

function checkCMSVersion(cmsInfo: CMSInfo | null): AuditCheck[] {
  const checks: AuditCheck[] = [];
  if (!cmsInfo || !cmsInfo.name) return checks;

  // Info check with CMS details
  checks.push({
    id: "cms-info",
    category: "cms",
    name: `CMS : ${cmsInfo.name}`,
    status: "info",
    description: [
      cmsInfo.version ? `Version : ${cmsInfo.version}` : "Version non détectée",
      cmsInfo.theme ? `Thème : ${cmsInfo.theme.name}${cmsInfo.theme.version ? ` v${cmsInfo.theme.version}` : ""}` : null,
      cmsInfo.plugins.length > 0 ? `${cmsInfo.plugins.length} extension(s) : ${cmsInfo.plugins.map((p) => p.name).slice(0, 10).join(", ")}${cmsInfo.plugins.length > 10 ? "..." : ""}` : null,
    ].filter(Boolean).join(" | "),
    value: cmsInfo.version || "Version inconnue",
  });

  // Version gap check — severity calibrated by major vs minor gap
  if (cmsInfo.version && cmsInfo.name) {
    const latest = KNOWN_LATEST_VERSIONS[cmsInfo.name];
    if (latest) {
      const gap = versionGap(cmsInfo.version, latest);
      if (gap === "major") {
        checks.push({
          id: "cms-outdated",
          category: "cms",
          name: `${cmsInfo.name} majeure obsolète`,
          status: "fail",
          severity: "high",
          description: `${cmsInfo.name} ${cmsInfo.version} a au moins une version majeure de retard (dernière connue : ${latest}). Les anciennes versions ne reçoivent plus de correctifs de sécurité.`,
          recommendation: `Mettez à jour ${cmsInfo.name} vers la dernière version majeure.`,
        });
      } else if (gap === "minor") {
        checks.push({
          id: "cms-outdated-minor",
          category: "cms",
          name: `${cmsInfo.name} légèrement obsolète`,
          status: "warn",
          severity: "low",
          description: `${cmsInfo.name} ${cmsInfo.version} — version mineure en retard (dernière connue : ${latest}).`,
          recommendation: `Mettez à jour ${cmsInfo.name} vers la dernière version mineure.`,
        });
      } else {
        checks.push({
          id: "cms-uptodate",
          category: "cms",
          name: `${cmsInfo.name} est à jour`,
          status: "pass",
          description: `${cmsInfo.name} ${cmsInfo.version} est à jour.`,
        });
      }
    }
  }

  return checks;
}

// =============================================================================
// PERFORMANCE
// =============================================================================

function checkPerformance(headers: Headers, html: string, responseTime: number): AuditCheck[] {
  const checks: AuditCheck[] = [];

  checks.push({
    id: "response-time",
    category: "performance",
    name: "Temps de réponse serveur",
    status: responseTime < 500 ? "pass" : responseTime < 1500 ? "warn" : "fail",
    severity: responseTime >= 1500 ? "medium" : undefined,
    description: `Réponse en ${responseTime}ms.${responseTime < 500 ? " Excellent !" : responseTime < 1500 ? " Acceptable." : " Trop lent."}`,
    value: `${responseTime}ms`,
    recommendation: responseTime >= 1500
      ? "Optimisez: cache serveur, CDN, compression gzip/brotli, optimisation base de données."
      : undefined,
  });

  // Compression
  const encoding = headers.get("content-encoding");
  checks.push({
    id: "compression",
    category: "performance",
    name: "Compression (Gzip/Brotli)",
    status: encoding ? "pass" : "warn",
    severity: !encoding ? "low" : undefined,
    description: encoding
      ? `Compression activée : ${encoding}.`
      : "Aucune compression détectée. Le site transfère plus de données que nécessaire.",
    value: encoding || undefined,
    recommendation: !encoding
      ? "Activez la compression gzip ou brotli dans votre serveur web."
      : undefined,
  });

  // HTML size — perf-only signal (les sites SSR/RSC modernes pèsent souvent >500 Ko), jamais de fail
  const htmlSize = new Blob([html]).size;
  const htmlSizeKB = Math.round(htmlSize / 1024);
  const htmlStatus: "pass" | "info" | "warn" = htmlSizeKB < 500 ? "pass" : htmlSizeKB < 1500 ? "info" : "warn";
  checks.push({
    id: "html-size",
    category: "performance",
    name: "Taille du HTML",
    status: htmlStatus,
    severity: htmlStatus === "warn" ? "low" : undefined,
    description: `Page HTML : ${htmlSizeKB} Ko.${htmlSizeKB < 500 ? " Optimal." : htmlSizeKB < 1500 ? " Courant sur les sites SSR modernes." : " Volumineux — pensez au streaming ou à la pagination."}`,
    value: `${htmlSizeKB} Ko`,
    recommendation: htmlSizeKB >= 500
      ? "Réduisez la taille du HTML : lazy loading, pagination, suppression du code inline inutile."
      : undefined,
  });

  return checks;
}

// =============================================================================
// SCORE CALCULATION
// =============================================================================

const categoryLabelMap: Record<string, string> = {
  ssl: "SSL / HTTPS",
  headers: "En-têtes de sécurité",
  "info-leak": "Fuite d'information",
  cookies: "Cookies",
  owasp: "OWASP — Vulnérabilités",
  xss: "Protection XSS & CSRF",
  infra: "Infrastructure & DNS",
  rgpd: "RGPD / Compliance",
  incident: "Monitoring & Réponse",
  performance: "Performance",
  wordpress: "WordPress Security",
};

function scoreFromChecks(checks: AuditCheck[]): { score: number; grade: string } {
  const scorable = checks.filter((c) => c.status !== "info");
  if (scorable.length === 0) return { score: 100, grade: "A+" };

  let total = 0;
  for (const c of scorable) {
    if (c.status === "pass") total += 1;
    else if (c.status === "warn") total += 0.4;
  }

  const score = Math.round((total / scorable.length) * 100);

  let grade = "F";
  if (score >= 95) grade = "A+";
  else if (score >= 85) grade = "A";
  else if (score >= 75) grade = "B";
  else if (score >= 60) grade = "C";
  else if (score >= 40) grade = "D";

  return { score, grade };
}

function calculateScore(checks: AuditCheck[]): {
  score: number;
  grade: string;
  status: "production-ready" | "needs-fixes" | "at-risk" | "critical";
  categoryScores: CategoryScore[];
} {
  const { score, grade } = scoreFromChecks(checks);

  // Category scores
  const categories = [...new Set(checks.map((c) => c.category))];
  const categoryScores: CategoryScore[] = categories
    .filter((cat) => categoryLabelMap[cat])
    .map((cat) => {
      const catChecks = checks.filter((c) => c.category === cat);
      const scorable = catChecks.filter((c) => c.status !== "info");
      const { score: catScore, grade: catGrade } = scoreFromChecks(catChecks);
      return {
        category: cat,
        label: categoryLabelMap[cat] || cat,
        score: catScore,
        grade: catGrade,
        total: scorable.length,
        passed: scorable.filter((c) => c.status === "pass").length,
        warned: scorable.filter((c) => c.status === "warn").length,
        failed: scorable.filter((c) => c.status === "fail").length,
      };
    });

  // Overall status
  const hasCritical = checks.some((c) => c.severity === "critical" && c.status === "fail");
  const hasHigh = checks.some((c) => c.severity === "high" && c.status === "fail");
  let status: "production-ready" | "needs-fixes" | "at-risk" | "critical" = "production-ready";
  if (hasCritical) status = "critical";
  else if (hasHigh) status = "at-risk";
  else if (score < 75) status = "needs-fixes";

  return { score, grade, status, categoryScores };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL manquante" }, { status: 400 });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: "URL invalide" }, { status: 400 });
    }

    let isHttps = targetUrl.startsWith("https://");

    // Try HTTPS if HTTP
    if (!isHttps) {
      const httpsUrl = targetUrl.replace("http://", "https://");
      const res = await safeFetch(httpsUrl, { method: "HEAD", timeout: 5000 });
      if (res) {
        isHttps = true;
        targetUrl = httpsUrl;
      }
    }

    // Fetch the page
    const startTime = Date.now();
    const response = await fetch(targetUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "TheWebmaster-SecurityAudit/2.0",
        Accept: "text/html",
      },
    });
    const responseTime = Date.now() - startTime;
    const html = await response.text();
    const headers = response.headers;

    // Infra detection (CDN/managed host) + shared soft 404 detector — done once, reused by all checks
    const infra = detectInfra(headers);
    const origin = new URL(targetUrl).origin;
    const hostname = new URL(targetUrl).hostname;
    const soft404 = await createSoft404Detector(origin);

    // Refresh the latest-known CMS versions in parallel with the main checks
    // (24 h cache, so this is cheap on repeated runs).
    try {
      const live = await preloadLatestVersions();
      KNOWN_LATEST_VERSIONS = { ...KNOWN_LATEST_VERSIONS, ...live };
    } catch {
      // Stay on fallback table
    }

    // Run all checks in parallel where possible
    const [
      sslChecks,
      tlsChecks,
      httpProtocolChecks,
      caaChecks,
      takeoverChecks,
      owaspChecks,
      dirListingChecks,
      graphqlChecks,
      infraChecks,
      incidentChecks,
      rgpdChecks,
      wpChecks,
      joomlaChecks,
      drupalChecks,
      psChecks,
    ] = await Promise.all([
      checkSSL(targetUrl, isHttps),
      checkTLS(targetUrl),
      checkHttpProtocols(targetUrl),
      checkCAA(hostname),
      checkSubdomainTakeover(hostname),
      checkOWASP(targetUrl, html, soft404),
      checkDirectoryListing(targetUrl, soft404),
      checkGraphQLIntrospection(targetUrl),
      checkInfrastructure(targetUrl, headers),
      checkIncidentResponse(targetUrl, headers, html, infra, soft404),
      checkRGPD(html, targetUrl),
      checkWordPress(targetUrl, html),
      checkJoomla(targetUrl, html),
      checkDrupal(targetUrl, html),
      checkPrestaShop(targetUrl, html),
    ]);

    // Deep CSP analysis (in addition to the basic presence check)
    const cspHeader = headers.get("content-security-policy") || headers.get("content-security-policy-report-only");
    const cspDeepChecks = analyzeCSP(cspHeader);

    const cmsInfo = detectCMSInfo(html);
    const cmsVersionChecks = checkCMSVersion(cmsInfo);

    // Multi-page crawl — audit representative routes to catch config inconsistencies
    // (e.g. headers present on / but absent on /login)
    let crawledRoutes: string[] = [];
    const crawlExtraChecks: AuditCheck[] = [];
    try {
      const discovered = await discoverRoutes(targetUrl, 5);
      if (discovered.length > 1) {
        const { routeHeaders, extraChecks } = await crawlAndAuditHeaders(discovered);
        crawledRoutes = routeHeaders.map((r) => r.route);
        crawlExtraChecks.push(...extraChecks);
      } else if (discovered.length === 1) {
        crawledRoutes = discovered;
      }
    } catch {
      // Crawl is best-effort — a failure must not break the main audit
    }

    const baseChecks: AuditCheck[] = [
      ...sslChecks,
      ...tlsChecks,
      ...httpProtocolChecks,
      ...checkSecurityHeaders(headers, infra),
      ...cspDeepChecks,
      ...checkInfoLeakage(headers),
      ...checkSecretsExposure(html),
      ...checkCookies(headers),
      ...owaspChecks,
      ...dirListingChecks,
      ...graphqlChecks,
      ...infraChecks,
      ...caaChecks,
      ...takeoverChecks,
      ...rgpdChecks,
      ...checkXSSVectors(html),
      ...incidentChecks,
      ...checkPerformance(headers, html, responseTime),
      ...wpChecks,
      ...joomlaChecks,
      ...drupalChecks,
      ...psChecks,
      ...cmsVersionChecks,
      ...crawlExtraChecks,
    ];

    const technologies = detectTechnologies(headers, html);
    const stackInfo = detectStack(html, headers, technologies);

    // Enrich checks with compliance refs + stack-specific remediations
    const enrichedChecks = enhanceWithStackRemediations(
      enrichWithCompliance(baseChecks),
      stackInfo
    );

    const { score, grade, status, categoryScores } = calculateScore(enrichedChecks);

    // Generate action plan (top-N prioritized by ROI)
    const actionPlan = buildActionPlan(enrichedChecks, 10);

    // Build threat model based on detected stack + current findings
    const threatModel = buildThreatModel(
      stackInfo,
      enrichedChecks.map((c) => ({ id: c.id, status: c.status }))
    );

    // Regression detection — compare with last stored audit of the same site
    let regressions: Regression[] = [];
    try {
      const previous = getPreviousAudit(targetUrl, "security");
      if (previous && previous.report && typeof previous.report === "object") {
        const prevReport = previous.report as { checks?: AuditCheck[] };
        const prevChecks = Array.isArray(prevReport.checks) ? prevReport.checks : [];
        const prevMap = new Map(prevChecks.map((c) => [c.id, c]));
        const regressionSeverity: Record<string, number> = { pass: 0, info: 0, warn: 1, fail: 2 };
        for (const curr of enrichedChecks) {
          const prev = prevMap.get(curr.id);
          if (!prev) continue;
          const prevLvl = regressionSeverity[prev.status] ?? 0;
          const currLvl = regressionSeverity[curr.status] ?? 0;
          if (currLvl > prevLvl) {
            regressions.push({
              checkId: curr.id,
              name: curr.name,
              previousStatus: prev.status,
              currentStatus: curr.status,
              previousAuditAt: previous.createdAt,
            });
          }
        }
        // Cap to 10
        regressions = regressions.slice(0, 10);
      }
    } catch {
      // Regression detection is best-effort
    }

    // Persist the full report so it can be shared publicly + used as baseline
    let reportId: string | undefined;
    try {
      reportId = insertAuditReport({
        siteUrl: targetUrl,
        score,
        grade,
        auditType: "security",
        report: {
          url: targetUrl,
          timestamp: new Date().toISOString(),
          score,
          grade,
          status,
          checks: enrichedChecks,
          categoryScores,
          responseTime,
          tlsInfo: { secure: isHttps },
          technologies,
          cmsInfo,
          stack: stackInfo,
          actionPlan,
          threatModel,
          regressions,
          crawledRoutes,
        },
      });
    } catch {
      // Storage failure must not break the response
    }

    const result: AuditResult = {
      url: targetUrl,
      timestamp: new Date().toISOString(),
      score,
      grade,
      status,
      checks: enrichedChecks,
      categoryScores,
      responseTime,
      tlsInfo: { secure: isHttps },
      technologies,
      cmsInfo,
      stack: stackInfo,
      actionPlan,
      threatModel,
      regressions,
      crawledRoutes,
      reportId,
      publicUrl: reportId ? `/security-audit/r/${reportId}` : undefined,
    };

    // Track audit request
    try {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      insertAuditRequest({ siteUrl: result.url, auditType: "security", score: result.score, grade: result.grade, ipAddress: ip });
    } catch { /* non-blocking */ }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Security Audit] Error:", error);
    return NextResponse.json(
      { error: "Impossible d'analyser ce site. Vérifiez l'URL et réessayez." },
      { status: 500 }
    );
  }
}
