import type { AuditCheck } from "@/types/audit";

// Subdomain takeover fingerprints: when a CNAME points to a third-party service
// that no longer owns the target (unclaimed GitHub Pages, deprovisioned Heroku app,
// expired AWS S3 bucket), an attacker can re-claim the service's free tier and
// serve content on your subdomain.
//
// Source: https://github.com/EdOverflow/can-i-take-over-xyz (fingerprints)

interface DnsAnswer {
  name: string;
  type: number;
  data: string;
}
interface DnsResponse {
  Status: number;
  Answer?: DnsAnswer[];
}

interface TakeoverFingerprint {
  service: string;
  cnameContains: RegExp;
  bodyMatch: RegExp;
  severity: "high" | "medium";
}

const FINGERPRINTS: TakeoverFingerprint[] = [
  {
    service: "GitHub Pages",
    cnameContains: /\.github\.io$/i,
    bodyMatch: /There isn't a GitHub Pages site here\.?/i,
    severity: "high",
  },
  {
    service: "Heroku",
    cnameContains: /\.herokuapp\.com$/i,
    bodyMatch: /No such app|herokucdn\.com\/error-pages\/no-such-app\.html/i,
    severity: "high",
  },
  {
    service: "AWS S3",
    cnameContains: /s3(?:-[\w-]+)?\.amazonaws\.com$/i,
    bodyMatch: /NoSuchBucket|The specified bucket does not exist/i,
    severity: "high",
  },
  {
    service: "Azure",
    cnameContains: /\.(?:azurewebsites\.net|cloudapp\.net|trafficmanager\.net|azure-api\.net)$/i,
    bodyMatch: /404 Web Site not found|Azure|Error 404/i,
    severity: "high",
  },
  {
    service: "Shopify",
    cnameContains: /\.myshopify\.com$/i,
    bodyMatch: /Sorry, this shop is currently unavailable/i,
    severity: "high",
  },
  {
    service: "Fastly",
    cnameContains: /\.fastly\.net$/i,
    bodyMatch: /Fastly error: unknown domain/i,
    severity: "high",
  },
  {
    service: "Netlify",
    cnameContains: /\.netlify\.(?:app|com)$/i,
    bodyMatch: /Not Found[\s\S]{0,200}netlify/i,
    severity: "medium",
  },
  {
    service: "Ghost",
    cnameContains: /\.ghost\.io$/i,
    bodyMatch: /The thing you were looking for is no longer here/i,
    severity: "high",
  },
  {
    service: "Readme.io",
    cnameContains: /\.readme\.io$/i,
    bodyMatch: /Project doesnt exist\.?\.\.\.?\s?yet!/i,
    severity: "medium",
  },
  {
    service: "Tumblr",
    cnameContains: /\.tumblr\.com$/i,
    bodyMatch: /There's nothing here|Whatever you were looking for doesn't currently exist/i,
    severity: "medium",
  },
];

async function doh(name: string, type: string): Promise<DnsResponse | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, {
      signal: controller.signal,
      headers: { Accept: "application/dns-json" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as DnsResponse;
  } catch {
    return null;
  }
}

async function fetchBody(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "TheWebmaster-SecurityAudit/2.0" },
    });
    clearTimeout(timer);
    const body = await res.text();
    return body.substring(0, 5000); // enough for the fingerprint
  } catch {
    return null;
  }
}

export async function checkSubdomainTakeover(hostname: string): Promise<AuditCheck[]> {
  const dns = await doh(hostname, "CNAME");
  const cnameTargets = (dns?.Answer ?? [])
    .filter((a) => a.type === 5)
    .map((a) => a.data.replace(/\.$/, ""));

  if (cnameTargets.length === 0) return [];

  // Identify which fingerprint the CNAME could match
  const matched = cnameTargets
    .map((cname) => ({
      cname,
      fp: FINGERPRINTS.find((f) => f.cnameContains.test(cname)),
    }))
    .filter((e): e is { cname: string; fp: TakeoverFingerprint } => e.fp !== undefined);

  if (matched.length === 0) return [];

  const checks: AuditCheck[] = [];
  for (const { cname, fp } of matched) {
    // Only flag as TAKEOVER if the body at https://{hostname}/ matches the
    // "unclaimed" fingerprint — a pointed CNAME to github.io is not a
    // vulnerability per se unless the target project is deleted.
    const body = await fetchBody(`https://${hostname}/`);
    if (!body) continue;
    if (fp.bodyMatch.test(body)) {
      checks.push({
        id: `subdomain-takeover-${fp.service.toLowerCase().replace(/\s+/g, "-")}`,
        category: "infra",
        name: `Risque de takeover (${fp.service})`,
        status: "fail",
        severity: fp.severity,
        description: `Le sous-domaine ${hostname} pointe vers ${cname} (${fp.service}) mais le service renvoie une page "inexistant". Un attaquant peut re-réclamer ${cname} et prendre le contrôle du sous-domaine.`,
        value: `CNAME: ${cname}`,
        recommendation: `Supprimez immédiatement l'enregistrement CNAME pour ${hostname}, ou re-provisionnez la ressource chez ${fp.service}.`,
      });
    }
  }

  return checks;
}
