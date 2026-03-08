import { NextRequest, NextResponse } from "next/server";

// =============================================================================
// SECURITY AUDIT API — Full Expert Analysis
// OWASP, Infrastructure, RGPD Compliance, Incident Response
// =============================================================================

interface AuditCheck {
  id: string;
  category: string;
  name: string;
  status: "pass" | "warn" | "fail" | "info";
  severity?: "critical" | "high" | "medium" | "low" | "info";
  description: string;
  value?: string;
  recommendation?: string;
}

interface CategoryScore {
  category: string;
  label: string;
  score: number;
  grade: string;
  total: number;
  passed: number;
  warned: number;
  failed: number;
}

interface AuditResult {
  url: string;
  timestamp: string;
  score: number;
  grade: string;
  status: "production-ready" | "needs-fixes" | "at-risk" | "critical";
  checks: AuditCheck[];
  categoryScores: CategoryScore[];
  responseTime: number;
  tlsInfo: { secure: boolean };
  technologies: string[];
}

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
// 2. SECURITY HEADERS (OWASP)
// =============================================================================

function checkSecurityHeaders(headers: Headers): AuditCheck[] {
  const checks: AuditCheck[] = [];

  // HSTS
  const hsts = headers.get("strict-transport-security");
  if (!hsts) {
    checks.push({
      id: "hsts",
      category: "headers",
      name: "HTTP Strict Transport Security (HSTS)",
      status: "fail",
      severity: "high",
      description: "HSTS absent. Vulnérable aux attaques de downgrade SSL et MITM.",
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
  const csp = headers.get("content-security-policy");
  if (!csp) {
    checks.push({
      id: "csp",
      category: "headers",
      name: "Content Security Policy (CSP)",
      status: "fail",
      severity: "high",
      description: "Aucune CSP définie. Le site est vulnérable aux attaques XSS et injection de code.",
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

  // Simple headers
  const simpleHeaders = [
    {
      name: "x-content-type-options",
      id: "x-content-type",
      display: "X-Content-Type-Options",
      severity: "medium" as const,
      rec: "Ajoutez l'en-tête :\n\n# Nginx\nadd_header X-Content-Type-Options \"nosniff\" always;\n\n# Apache\nHeader always set X-Content-Type-Options \"nosniff\"\n\n// Next.js\nheaders: [{ key: 'X-Content-Type-Options', value: 'nosniff' }]",
      desc: "Empêche le MIME-type sniffing qui peut mener à des attaques XSS.",
    },
    {
      name: "x-frame-options",
      id: "x-frame",
      display: "X-Frame-Options (Clickjacking)",
      severity: "high" as const,
      rec: "Protégez contre le clickjacking :\n\n# Nginx\nadd_header X-Frame-Options \"DENY\" always;\n\n# Apache\nHeader always set X-Frame-Options \"DENY\"\n\n// Next.js\nheaders: [{ key: 'X-Frame-Options', value: 'DENY' }]\n\nUtilisez SAMEORIGIN si vous avez besoin d'iframes internes.",
      desc: "Protège contre les attaques de clickjacking via iframe.",
    },
    {
      name: "referrer-policy",
      id: "referrer",
      display: "Referrer-Policy",
      severity: "low" as const,
      rec: "Contrôlez les informations Referer :\n\n# Nginx\nadd_header Referrer-Policy \"strict-origin-when-cross-origin\" always;\n\n// Next.js\nheaders: [{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }]",
      desc: "Contrôle les informations envoyées dans le header Referer.",
    },
    {
      name: "permissions-policy",
      id: "permissions",
      display: "Permissions-Policy",
      severity: "medium" as const,
      rec: "Restreignez les APIs navigateur :\n\n# Nginx\nadd_header Permissions-Policy \"camera=(), microphone=(), geolocation=(), interest-cohort=()\" always;\n\n// Next.js\nheaders: [{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }]",
      desc: "Contrôle l'accès aux APIs sensibles du navigateur (caméra, micro, géolocalisation).",
    },
    {
      name: "cross-origin-opener-policy",
      id: "coop",
      display: "Cross-Origin-Opener-Policy (COOP)",
      severity: "low" as const,
      rec: "Ajoutez: Cross-Origin-Opener-Policy: same-origin",
      desc: "Isole le contexte de navigation pour prévenir les attaques cross-origin.",
    },
    {
      name: "cross-origin-resource-policy",
      id: "corp",
      display: "Cross-Origin-Resource-Policy (CORP)",
      severity: "low" as const,
      rec: "Ajoutez: Cross-Origin-Resource-Policy: same-origin",
      desc: "Empêche le chargement cross-origin non autorisé des ressources.",
    },
    {
      name: "cross-origin-embedder-policy",
      id: "coep",
      display: "Cross-Origin-Embedder-Policy (COEP)",
      severity: "low" as const,
      rec: "Ajoutez: Cross-Origin-Embedder-Policy: require-corp",
      desc: "Requiert CORP/CORS pour toutes les ressources cross-origin embarquées.",
    },
  ];

  for (const h of simpleHeaders) {
    const value = headers.get(h.name);
    checks.push({
      id: h.id,
      category: "headers",
      name: h.display,
      status: value ? "pass" : "fail",
      severity: !value ? h.severity : undefined,
      description: value
        ? `${h.display} est configuré. ${h.desc}`
        : `${h.display} est absent. ${h.desc}`,
      value: value || undefined,
      recommendation: !value ? h.rec : undefined,
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

  // Server header
  const server = headers.get("server");
  if (server) {
    const hasVersion = /[\d.]+/.test(server);
    checks.push({
      id: "server-header",
      category: "info-leak",
      name: "En-tête Server",
      status: hasVersion ? "warn" : "info",
      severity: hasVersion ? "medium" : undefined,
      description: hasVersion
        ? `Le serveur révèle sa version : "${server}". Cela facilite les attaques ciblées.`
        : `Le serveur s'identifie comme "${server}".`,
      value: server,
      recommendation: hasVersion
        ? "Masquez la version du serveur. Nginx: server_tokens off; Apache: ServerTokens Prod"
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

  // X-Powered-By
  const poweredBy = headers.get("x-powered-by");
  if (poweredBy) {
    checks.push({
      id: "x-powered-by",
      category: "info-leak",
      name: "X-Powered-By",
      status: "warn",
      severity: "medium",
      description: `Le site révèle sa technologie : "${poweredBy}".`,
      value: poweredBy,
      recommendation: "Supprimez X-Powered-By. Express: app.disable('x-powered-by'); PHP: expose_php = Off",
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

  // X-AspNet-Version
  const aspVersion = headers.get("x-aspnet-version");
  if (aspVersion) {
    checks.push({
      id: "x-aspnet",
      category: "info-leak",
      name: "X-AspNet-Version",
      status: "fail",
      severity: "high",
      description: `Version ASP.NET exposée : "${aspVersion}".`,
      value: aspVersion,
      recommendation: "Désactivez dans web.config: <httpRuntime enableVersionHeader=\"false\" />",
    });
  }

  // X-Generator
  const generator = headers.get("x-generator");
  if (generator) {
    checks.push({
      id: "x-generator",
      category: "info-leak",
      name: "X-Generator",
      status: "warn",
      severity: "low",
      description: `Générateur exposé : "${generator}".`,
      value: generator,
      recommendation: "Supprimez l'en-tête X-Generator de votre configuration.",
    });
  }

  return checks;
}

// =============================================================================
// 4. COOKIES
// =============================================================================

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
    const issues: string[] = [];

    if (!lower.includes("secure")) issues.push("Secure");
    if (!lower.includes("httponly")) issues.push("HttpOnly");
    if (!lower.includes("samesite")) issues.push("SameSite");

    const isSession = name.toLowerCase().includes("session") || name.toLowerCase().includes("sid");

    checks.push({
      id: `cookie-${name}`,
      category: "cookies",
      name: `Cookie: ${name}`,
      status: issues.length === 0 ? "pass" : issues.length >= 2 ? "fail" : "warn",
      severity: issues.length >= 2 && isSession ? "critical" : issues.length >= 2 ? "high" : issues.length > 0 ? "medium" : undefined,
      description:
        issues.length === 0
          ? `"${name}" a tous les attributs de sécurité.`
          : `"${name}" : attributs manquants — ${issues.join(", ")}.${isSession ? " ⚠️ Cookie de session !" : ""}`,
      value: cookie.length > 150 ? cookie.substring(0, 150) + "..." : cookie,
      recommendation:
        issues.length > 0
          ? `Ajoutez: ${issues.map((i) => i === "SameSite" ? "SameSite=Strict" : i).join("; ")}`
          : undefined,
    });
  }

  return checks;
}

// =============================================================================
// 5. OWASP — Sensitive Files & Directories
// =============================================================================

async function checkOWASP(baseUrl: string, html: string): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  const origin = new URL(baseUrl).origin;

  // ── SOFT 404 DETECTION ──────────────────────────────────────
  // Fetch a random non-existent path to get the "soft 404" fingerprint.
  // Many SPAs / catch-all servers return 200 with the same HTML for any URL.
  // We compare each probe response against this fingerprint to detect fakes.
  let soft404Fingerprint = "";
  let soft404Length = 0;
  try {
    const probe = await safeFetch(
      `${origin}/__soft404_probe_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      { method: "GET", redirect: "manual", timeout: 4000 }
    );
    if (probe && probe.status === 200) {
      const body = await probe.text();
      soft404Length = body.length;
      // Use first 500 chars as fingerprint (avoids dynamic tokens but catches structure)
      soft404Fingerprint = body.substring(0, 500);
    }
  } catch {
    // If probe fails, no soft 404 detection — rely on content checks only
  }

  function isSoft404(body: string): boolean {
    if (!soft404Fingerprint) return false;
    // Same length (±5%) AND same first 500 chars → soft 404
    const lengthSimilar = Math.abs(body.length - soft404Length) / Math.max(soft404Length, 1) < 0.05;
    const contentSimilar = body.substring(0, 500) === soft404Fingerprint;
    return lengthSimilar && contentSimilar;
  }

  // Sensitive paths to probe
  // contentCheck: strict regex to verify the response body is genuinely the expected file/page
  // NOT an HTML page that happens to contain the keyword
  const sensitivePaths = [
    { path: "/.env", name: "Fichier .env", severity: "critical" as const, desc: "Variables d'environnement (clés API, mots de passe)", contentCheck: /^[A-Z_]+=.+$/m, mustNotBeHtml: true },
    { path: "/.git/HEAD", name: "Répertoire .git", severity: "critical" as const, desc: "Code source et historique Git", contentCheck: /^ref:\s+refs\//, mustNotBeHtml: true },
    { path: "/wp-admin/", name: "WordPress Admin", severity: "high" as const, desc: "Interface d'administration WordPress", contentCheck: /wp-login\.php/, mustNotBeHtml: false },
    { path: "/wp-login.php", name: "WordPress Login", severity: "medium" as const, desc: "Page de connexion WordPress", contentCheck: /name="log"[\s\S]*name="pwd"|wp-login\.php\?action=/i, mustNotBeHtml: false },
    { path: "/xmlrpc.php", name: "WordPress XML-RPC", severity: "high" as const, desc: "API XML-RPC (vecteur de brute-force)", contentCheck: /XML-RPC server accepts POST requests only/i, mustNotBeHtml: true },
    { path: "/phpmyadmin/", name: "phpMyAdmin", severity: "critical" as const, desc: "Interface de gestion de base de données", contentCheck: /phpMyAdmin|pma_navigation/i, mustNotBeHtml: false },
    { path: "/adminer.php", name: "Adminer", severity: "critical" as const, desc: "Interface de gestion de base de données", contentCheck: /adminer\.design|adminer\.js|name="auth\[/i, mustNotBeHtml: false },
    { path: "/server-status", name: "Apache Server Status", severity: "high" as const, desc: "Informations internes du serveur Apache", contentCheck: /Apache Server Status for|Total Accesses:/i, mustNotBeHtml: false },
    { path: "/server-info", name: "Apache Server Info", severity: "high" as const, desc: "Configuration Apache exposée", contentCheck: /Apache Server Information|Server Version:/i, mustNotBeHtml: false },
    { path: "/.htaccess", name: "Fichier .htaccess", severity: "high" as const, desc: "Configuration Apache", contentCheck: /RewriteEngine|RewriteRule|RewriteCond/i, mustNotBeHtml: true },
    { path: "/web.config", name: "Fichier web.config", severity: "high" as const, desc: "Configuration IIS/ASP.NET", contentCheck: /^<\?xml[^]*<configuration/i, mustNotBeHtml: true },
    { path: "/robots.txt", name: "robots.txt", severity: "info" as const, desc: "Directives pour les moteurs de recherche", contentCheck: /^User-agent:/im, mustNotBeHtml: true },
    { path: "/sitemap.xml", name: "sitemap.xml", severity: "info" as const, desc: "Plan du site pour les moteurs de recherche", contentCheck: /^<\?xml[^]*<urlset|^<\?xml[^]*<sitemapindex/i, mustNotBeHtml: true },
    { path: "/backup.zip", name: "Fichier de sauvegarde", severity: "critical" as const, desc: "Archive de sauvegarde exposée", contentCheck: /^PK\x03\x04/, mustNotBeHtml: true, contentType: "application/zip" },
    { path: "/backup.sql", name: "Dump SQL", severity: "critical" as const, desc: "Dump de base de données exposé", contentCheck: /^--|^\/\*|CREATE TABLE|INSERT INTO|DROP TABLE|mysqldump/im, mustNotBeHtml: true },
    { path: "/debug", name: "Page de debug", severity: "high" as const, desc: "Interface de débogage", contentCheck: /Traceback \(most recent|<div class="traceback|Django Debug|Symfony Profiler|laravel_debugbar/i, mustNotBeHtml: false },
    { path: "/phpinfo.php", name: "phpinfo()", severity: "high" as const, desc: "Informations complètes sur la configuration PHP", contentCheck: /phpinfo\(\)|PHP Version \d|Configuration File/i, mustNotBeHtml: false },
    { path: "/info.php", name: "info.php", severity: "high" as const, desc: "Informations PHP exposées", contentCheck: /phpinfo\(\)|PHP Version \d/i, mustNotBeHtml: false },
    { path: "/.DS_Store", name: "Fichier .DS_Store", severity: "medium" as const, desc: "Métadonnées macOS (structure de répertoire)", contentCheck: /Bud1/, mustNotBeHtml: true, contentType: "application/octet-stream" },
    { path: "/wp-json/wp/v2/users", name: "WordPress REST API Users", severity: "high" as const, desc: "Énumération des utilisateurs WordPress", contentCheck: /^\s*\[[\s\S]*"slug"\s*:/i, mustNotBeHtml: true },
    { path: "/api/", name: "Répertoire API", severity: "info" as const, desc: "Point d'entrée API détecté", contentCheck: null, mustNotBeHtml: false },
  ];

  const exposed: AuditCheck[] = [];
  const safe: string[] = [];

  // Parallel fetch — use GET to validate response body + soft 404 detection
  const results = await Promise.all(
    sensitivePaths.map(async (item) => {
      const res = await safeFetch(`${origin}${item.path}`, {
        method: "GET",
        redirect: "manual",
        timeout: 3000,
      });
      let bodyMatch = false;
      if (res && res.status === 200 && item.contentCheck) {
        try {
          const contentType = res.headers.get("content-type") || "";
          // For binary files, check content-type instead of body
          if (item.contentType) {
            bodyMatch = contentType.includes(item.contentType);
          } else {
            const body = await res.text();

            // Soft 404 detection — if response matches the catch-all page, skip
            if (isSoft404(body)) {
              bodyMatch = false;
            } else {
              // If file must NOT be HTML but response is HTML → false positive
              if (item.mustNotBeHtml && (contentType.includes("text/html") || body.trimStart().startsWith("<!") || body.trimStart().startsWith("<html"))) {
                bodyMatch = false;
              } else {
                const snippet = body.substring(0, 5000);
                bodyMatch = item.contentCheck.test(snippet);
              }
            }
          }
        } catch {
          bodyMatch = false;
        }
      } else if (res && res.status === 200 && !item.contentCheck) {
        // No content check needed (e.g. /api/) — but still check soft 404
        try {
          const body = await res.text();
          bodyMatch = !isSoft404(body);
        } catch {
          bodyMatch = false;
        }
      }
      return { item, status: res?.status || 0, bodyMatch };
    })
  );

  for (const { item, status, bodyMatch } of results) {
    if (status === 200 && bodyMatch && item.severity !== "info") {
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
    } else if (status === 200 && bodyMatch && item.severity === "info") {
      checks.push({
        id: `owasp-${item.path.replace(/[/.]/g, "-")}`,
        category: "owasp",
        name: item.name,
        status: "info",
        description: `${item.name} est accessible.`,
        value: `${origin}${item.path}`,
      });
    } else {
      safe.push(item.path);
    }
  }

  // Soft 404 warning — if catch-all detected, inform user
  if (soft404Fingerprint) {
    checks.push({
      id: "owasp-soft404",
      category: "owasp",
      name: "Détection Soft 404 (Catch-All)",
      status: "info",
      description: "Le serveur retourne HTTP 200 pour les pages inexistantes au lieu de 404. Cela peut masquer des problèmes réels et tromper les scanners.",
      recommendation: "Configurez votre serveur pour retourner un vrai status 404 pour les pages inexistantes.",
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

  // HTTP Methods
  const optionsRes = await safeFetch(baseUrl, { method: "OPTIONS", timeout: 3000 });
  if (optionsRes) {
    const allow = optionsRes.headers.get("allow") || optionsRes.headers.get("access-control-allow-methods") || "";
    const dangerous = ["PUT", "DELETE", "TRACE", "CONNECT"].filter((m) =>
      allow.toUpperCase().includes(m)
    );
    checks.push({
      id: "http-methods",
      category: "owasp",
      name: "Méthodes HTTP dangereuses",
      status: dangerous.length > 0 ? "warn" : "pass",
      severity: dangerous.length > 0 ? "medium" : undefined,
      description:
        dangerous.length > 0
          ? `Méthodes dangereuses activées : ${dangerous.join(", ")}.`
          : "Aucune méthode HTTP dangereuse détectée.",
      value: allow || undefined,
      recommendation:
        dangerous.length > 0
          ? `Désactivez les méthodes ${dangerous.join(", ")} dans la configuration serveur.`
          : undefined,
    });
  }

  // CORS check
  const corsRes = await safeFetch(baseUrl, {
    headers: { Origin: "https://evil-attacker.com" } as Record<string, string>,
    timeout: 3000,
  });
  if (corsRes) {
    const acao = corsRes.headers.get("access-control-allow-origin");
    if (acao === "*") {
      checks.push({
        id: "cors-wildcard",
        category: "owasp",
        name: "CORS Wildcard (*)",
        status: "warn",
        severity: "medium",
        description: "Access-Control-Allow-Origin est configuré sur '*'. Tout domaine peut effectuer des requêtes cross-origin.",
        value: acao,
        recommendation: "Restreignez CORS aux domaines de confiance uniquement.",
      });
    } else if (acao === "https://evil-attacker.com") {
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
    } else {
      checks.push({
        id: "cors",
        category: "owasp",
        name: "Configuration CORS",
        status: "pass",
        description: acao
          ? `CORS correctement restreint à : ${acao}`
          : "Pas d'en-tête CORS permissif détecté.",
        value: acao || undefined,
      });
    }
  }

  // SRI (Subresource Integrity) check
  const scripts = html.match(/<script[^>]+src[^>]+>/gi) || [];
  const externalScripts = scripts.filter(
    (s) => s.includes("http://") || s.includes("https://")
  );
  const withSRI = externalScripts.filter((s) => s.includes("integrity="));
  if (externalScripts.length > 0) {
    checks.push({
      id: "sri",
      category: "owasp",
      name: "Subresource Integrity (SRI)",
      status: withSRI.length === externalScripts.length ? "pass" : "warn",
      severity: withSRI.length < externalScripts.length ? "medium" : undefined,
      description:
        withSRI.length === externalScripts.length
          ? `Tous les ${externalScripts.length} scripts externes ont un attribut integrity.`
          : `${withSRI.length}/${externalScripts.length} scripts externes ont un attribut integrity.`,
      recommendation:
        withSRI.length < externalScripts.length
          ? "Ajoutez un attribut integrity= sur tous les scripts et styles externes."
          : undefined,
    });
  }

  // Mixed content
  const httpResources = html.match(/http:\/\/[^"'\s]+\.(js|css|png|jpg|jpeg|gif|svg|woff2?)/gi);
  checks.push({
    id: "mixed-content",
    category: "owasp",
    name: "Contenu mixte (Mixed Content)",
    status: httpResources ? "fail" : "pass",
    severity: httpResources ? "high" : undefined,
    description: httpResources
      ? `${httpResources.length} ressource(s) chargée(s) en HTTP détectée(s).`
      : "Aucune ressource HTTP non sécurisée détectée.",
    value: httpResources?.slice(0, 3).join(", "),
    recommendation: httpResources
      ? "Migrez toutes les ressources vers HTTPS."
      : undefined,
  });

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
      status: "warn",
      severity: "low",
      description: "Aucun fichier security.txt trouvé. Ce fichier permet aux chercheurs en sécurité de signaler des vulnérabilités.",
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

  // DNS check via DNS-over-HTTPS
  try {
    const dnsRes = await safeFetch(
      `https://dns.google/resolve?name=${hostname}&type=TXT`,
      { timeout: 5000 }
    );
    if (dnsRes?.ok) {
      const dnsData = await dnsRes.json();
      const txtRecords: string[] = (dnsData.Answer || [])
        .filter((r: { type: number }) => r.type === 16)
        .map((r: { data: string }) => r.data);

      // SPF
      const spf = txtRecords.find((r) => r.includes("v=spf1"));
      checks.push({
        id: "dns-spf",
        category: "infra",
        name: "SPF (Sender Policy Framework)",
        status: spf ? "pass" : "warn",
        severity: !spf ? "medium" : undefined,
        description: spf
          ? "Enregistrement SPF configuré. Protège contre l'usurpation d'email."
          : "Aucun enregistrement SPF trouvé. Les emails du domaine peuvent être usurpés.",
        value: spf?.substring(0, 200),
        recommendation: !spf
          ? "Ajoutez un enregistrement TXT SPF : v=spf1 include:votre_provider -all"
          : undefined,
      });

      // DMARC
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
        severity: !dmarc ? "medium" : undefined,
        description: dmarc
          ? "DMARC configuré. Les emails non authentifiés sont gérés selon votre politique."
          : "Aucun enregistrement DMARC trouvé. Vulnérable à l'usurpation d'email.",
        value: dmarc?.substring(0, 200) || undefined,
        recommendation: !dmarc
          ? "Ajoutez un enregistrement TXT _dmarc : v=DMARC1; p=quarantine; rua=mailto:dmarc@votredomaine.com"
          : undefined,
      });

      // DKIM hint (can't fully verify without knowing selector)
      const hasDKIM = txtRecords.some((r) => r.includes("DKIM"));
      checks.push({
        id: "dns-dkim",
        category: "infra",
        name: "DKIM (Email Signing)",
        status: "info",
        description: hasDKIM
          ? "Références DKIM trouvées dans les enregistrements DNS."
          : "Impossible de vérifier DKIM sans connaître le sélecteur. Vérifiez dans votre configuration email.",
        recommendation: "Configurez DKIM via votre fournisseur email pour signer les messages sortants.",
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
  const lower = html.toLowerCase();
  const origin = new URL(baseUrl).origin;

  // Privacy policy detection — check text, links and href attributes
  let hasPrivacyLink =
    lower.includes("privacy") ||
    lower.includes("vie privée") ||
    lower.includes("confidentialité") ||
    lower.includes("confidentialite") ||
    lower.includes("données personnelles") ||
    lower.includes("donnees personnelles") ||
    lower.includes("protection des données") ||
    lower.includes("protection des donnees") ||
    lower.includes("privacybeleid") ||
    lower.includes("gegevensbescherming") ||
    lower.includes("datenschutz") ||
    lower.includes("rgpd") ||
    lower.includes("gdpr") ||
    /href=['"][^'"]*privac/i.test(html) ||
    /href=['"][^'"]*confidentialite/i.test(html) ||
    /href=['"][^'"]*donnees-personnelles/i.test(html);

  // Legal notice — check text and href attributes
  let hasLegal =
    lower.includes("mentions légales") ||
    lower.includes("mentions legales") ||
    lower.includes("legal notice") ||
    lower.includes("legal-notice") ||
    lower.includes("impressum") ||
    lower.includes("wettelijke vermeldingen") ||
    /href=['"][^'"]*mentions-legales/i.test(html) ||
    /href=['"][^'"]*legal/i.test(html);

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

  checks.push({
    id: "rgpd-privacy",
    category: "rgpd",
    name: "Politique de confidentialité",
    status: hasPrivacyLink ? "pass" : "fail",
    severity: !hasPrivacyLink ? "high" : undefined,
    description: hasPrivacyLink
      ? "Un lien vers une politique de confidentialité a été détecté."
      : "Aucune politique de confidentialité détectée. Obligation RGPD pour tout site collectant des données.",
    recommendation: !hasPrivacyLink
      ? "Ajoutez une page de politique de confidentialité accessible depuis toutes les pages."
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

  // Cookie consent banner
  const hasCookieBanner =
    lower.includes("cookie-consent") ||
    lower.includes("cookie-banner") ||
    lower.includes("cookieconsent") ||
    lower.includes("cookie_consent") ||
    lower.includes("tarteaucitron") ||
    lower.includes("onetrust") ||
    lower.includes("cookiebot") ||
    lower.includes("axeptio") ||
    lower.includes("didomi") ||
    lower.includes("consent-manager") ||
    lower.includes("cookie-notice") ||
    lower.includes("cc-window") ||
    lower.includes("gdpr-cookie");

  // Check if tracking cookies are set without consent
  const hasTracking =
    /googletagmanager\.com\/gtm\.js/i.test(html) ||
    /googletagmanager\.com\/gtag\/js/i.test(html) ||
    /google-analytics\.com/i.test(html) ||
    /gtag\s*\(/i.test(html) ||
    /connect\.facebook\.net/i.test(html) ||
    /fbq\s*\(/i.test(html) ||
    /static\.hotjar\.com|script\.hotjar\.com/i.test(html) ||
    /js\.hs-scripts\.com/i.test(html);

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

  // Third-party trackers inventory
  const trackers: string[] = [];
  if (lower.includes("google-analytics") || lower.includes("gtag")) trackers.push("Google Analytics");
  if (lower.includes("googletagmanager") || lower.includes("gtm.js")) trackers.push("Google Tag Manager");
  if (lower.includes("fbq(") || lower.includes("facebook.net")) trackers.push("Facebook/Meta Pixel");
  if (lower.includes("hotjar")) trackers.push("Hotjar");
  if (lower.includes("hubspot")) trackers.push("HubSpot");
  if (lower.includes("linkedin.com/px") || lower.includes("snap.licdn")) trackers.push("LinkedIn Insight");
  if (lower.includes("tiktok")) trackers.push("TikTok Pixel");
  if (lower.includes("pinterest")) trackers.push("Pinterest Tag");
  if (lower.includes("clarity.ms")) trackers.push("Microsoft Clarity");
  if (lower.includes("doubleclick") || lower.includes("googlesyndication")) trackers.push("Google Ads");

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

  // Form data collection
  const forms = html.match(/<form[^>]*>/gi) || [];
  const inputs = html.match(/<input[^>]*>/gi) || [];
  const collectsPersonalData = inputs.some((i) => {
    const l = i.toLowerCase();
    return (
      l.includes('type="email"') ||
      l.includes('name="email"') ||
      l.includes('name="phone"') ||
      l.includes('name="tel"') ||
      l.includes('name="name"') ||
      l.includes('name="nom"')
    );
  });

  if (collectsPersonalData) {
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

async function checkIncidentResponse(baseUrl: string, headers: Headers, html: string): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  const origin = new URL(baseUrl).origin;

  // Error page disclosure — test 404
  const error404 = await safeFetch(`${origin}/this-page-should-not-exist-${Date.now()}`, {
    timeout: 5000,
  });
  if (error404) {
    const errorHtml = await error404.text().catch(() => "");
    const lower = errorHtml.toLowerCase();
    const leaksInfo =
      lower.includes("stack trace") ||
      lower.includes("traceback") ||
      lower.includes("exception") ||
      lower.includes("at /") ||
      lower.includes("line ") ||
      lower.includes("debug") ||
      lower.includes("internal server error") ||
      lower.includes("sql") ||
      lower.includes("mysql") ||
      lower.includes("postgresql") ||
      lower.includes("mongodb");

    checks.push({
      id: "error-disclosure",
      category: "incident",
      name: "Divulgation d'erreur (Page 404)",
      status: leaksInfo ? "fail" : "pass",
      severity: leaksInfo ? "high" : undefined,
      description: leaksInfo
        ? "La page d'erreur expose des informations techniques (stack trace, paths, base de données)."
        : "La page d'erreur ne divulgue pas d'informations techniques sensibles.",
      recommendation: leaksInfo
        ? "Configurez des pages d'erreur personnalisées qui ne révèlent aucun détail technique."
        : undefined,
    });
  }

  // Debug mode detection
  const debugIndicators = [
    html.includes("DJANGO_SETTINGS_MODULE"),
    html.includes("debug=true"),
    html.includes("DEBUG = True"),
    html.includes("display_errors"),
    html.includes("Xdebug"),
    html.includes("php_error"),
    html.includes("laravel_debugbar"),
    html.includes("__debug__"),
    headers.get("x-debug-token") !== null,
    headers.get("x-debug-token-link") !== null,
  ];

  const debugFound = debugIndicators.some(Boolean);
  checks.push({
    id: "debug-mode",
    category: "incident",
    name: "Mode debug",
    status: debugFound ? "fail" : "pass",
    severity: debugFound ? "critical" : undefined,
    description: debugFound
      ? "Le mode debug semble activé en production ! Risque majeur de fuite d'information."
      : "Aucun indicateur de mode debug détecté.",
    recommendation: debugFound
      ? "Désactivez IMMÉDIATEMENT le mode debug en production (APP_DEBUG=false, DEBUG=False)."
      : undefined,
  });

  // Backup files exposure — with soft 404 detection
  const backupPaths = [
    "/backup.zip", "/backup.tar.gz", "/backup.sql.gz",
    "/db.sql", "/database.sql", "/dump.sql",
    "/site.zip", "/www.zip", "/public.zip",
  ];

  // Build soft 404 fingerprint for this function
  let backupSoft404Fingerprint = "";
  let backupSoft404Length = 0;
  try {
    const probe = await safeFetch(
      `${origin}/__soft404_probe_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      { method: "GET", redirect: "manual", timeout: 4000 }
    );
    if (probe && probe.status === 200) {
      const body = await probe.text();
      backupSoft404Length = body.length;
      backupSoft404Fingerprint = body.substring(0, 500);
    }
  } catch {}

  const exposedBackups: string[] = [];
  await Promise.all(
    backupPaths.map(async (path) => {
      const res = await safeFetch(`${origin}${path}`, { method: "GET", timeout: 4000 });
      if (!res?.ok) return;

      const contentType = res.headers.get("content-type") || "";
      // Backup files should NEVER be HTML — if HTML, it's a soft 404 / catch-all
      if (contentType.includes("text/html") || contentType.includes("application/xhtml")) return;

      // Check content-type matches expected binary/sql types
      const isBinary = contentType.includes("application/") || contentType.includes("octet-stream");
      const isSql = contentType.includes("text/plain") || contentType.includes("text/sql");
      if (!isBinary && !isSql) return;

      // Soft 404 check: compare body against fingerprint
      if (backupSoft404Fingerprint) {
        const body = await res.text().catch(() => "");
        const lengthSimilar = Math.abs(body.length - backupSoft404Length) / Math.max(backupSoft404Length, 1) < 0.05;
        const contentSimilar = body.substring(0, 500) === backupSoft404Fingerprint;
        if (lengthSimilar && contentSimilar) return;
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

  // Rate limiting headers
  const hasRateLimit =
    headers.get("x-ratelimit-limit") !== null ||
    headers.get("x-rate-limit-limit") !== null ||
    headers.get("retry-after") !== null ||
    headers.get("ratelimit-limit") !== null;

  checks.push({
    id: "rate-limit",
    category: "incident",
    name: "Limitation de débit (Rate Limiting)",
    status: hasRateLimit ? "pass" : "warn",
    severity: !hasRateLimit ? "medium" : undefined,
    description: hasRateLimit
      ? "Des en-têtes de rate limiting sont configurés."
      : "Aucun rate limiting détecté. Le site est vulnérable aux attaques par force brute et DDoS.",
    recommendation: !hasRateLimit
      ? "Implémentez un rate limiting (nginx limit_req, Cloudflare, ou au niveau applicatif)."
      : undefined,
  });

  // Cache headers
  const cacheControl = headers.get("cache-control");
  const etag = headers.get("etag");
  checks.push({
    id: "cache-headers",
    category: "incident",
    name: "En-têtes de cache",
    status: cacheControl || etag ? "pass" : "warn",
    severity: !cacheControl && !etag ? "low" : undefined,
    description:
      cacheControl || etag
        ? `Cache configuré : ${cacheControl || ""} ${etag ? "ETag présent" : ""}`.trim()
        : "Aucun en-tête de cache détecté. Impact sur la performance et la disponibilité.",
    value: cacheControl || undefined,
    recommendation: !cacheControl
      ? "Configurez Cache-Control pour optimiser les performances et réduire la charge serveur."
      : undefined,
  });

  return checks;
}

// =============================================================================
// 9. XSS & CODE ANALYSIS
// =============================================================================

function checkXSSVectors(html: string): AuditCheck[] {
  const checks: AuditCheck[] = [];

  // Inline event handlers
  const inlineHandlers = html.match(/\son\w+\s*=/gi) || [];
  if (inlineHandlers.length > 5) {
    checks.push({
      id: "inline-handlers",
      category: "xss",
      name: "Event handlers inline",
      status: "warn",
      severity: "medium",
      description: `${inlineHandlers.length} gestionnaires d'événements inline détectés (onclick, onload...).`,
      recommendation: "Utilisez addEventListener() au lieu des attributs inline pour réduire la surface XSS.",
    });
  }

  // document.write usage
  const docWrite = html.match(/document\.write\s*\(/g) || [];
  if (docWrite.length > 0) {
    checks.push({
      id: "document-write",
      category: "xss",
      name: "Utilisation de document.write()",
      status: "warn",
      severity: "medium",
      description: `${docWrite.length} appel(s) à document.write() détecté(s). Vecteur XSS potentiel.`,
      recommendation: "Remplacez document.write() par des manipulations DOM (createElement, innerHTML contrôlé).",
    });
  }

  // innerHTML assignments
  const innerHTML = html.match(/\.innerHTML\s*=/g) || [];
  if (innerHTML.length > 3) {
    checks.push({
      id: "innerhtml",
      category: "xss",
      name: "Assignation innerHTML",
      status: "info",
      description: `${innerHTML.length} assignation(s) innerHTML détectée(s). Assurez-vous que les données sont sanitisées.`,
      recommendation: "Utilisez textContent au lieu de innerHTML quand possible, ou sanitisez avec DOMPurify.",
    });
  }

  // eval usage
  const evalUsage = html.match(/[^a-z]eval\s*\(/gi) || [];
  if (evalUsage.length > 0) {
    checks.push({
      id: "eval-usage",
      category: "xss",
      name: "Utilisation d'eval()",
      status: "fail",
      severity: "high",
      description: `${evalUsage.length} appel(s) à eval() détecté(s). Vecteur d'injection de code majeur.`,
      recommendation: "Supprimez tous les appels à eval(). Utilisez JSON.parse() pour les données et des alternatives sûres.",
    });
  }

  // Forms
  const forms = html.match(/<form[^>]*>/gi) || [];
  const mutableForms = forms.filter((f) => {
    const methodMatch = f.match(/method\s*=\s*["']?([a-z]+)/i);
    const method = (methodMatch?.[1] || "get").toLowerCase();
    return method !== "get";
  });
  if (mutableForms.length > 0) {
    const hasCSRFToken = html.includes("csrf") || html.includes("_token") || html.includes("authenticity_token");
    checks.push({
      id: "csrf",
      category: "xss",
      name: "Protection CSRF",
      status: hasCSRFToken ? "pass" : "warn",
      severity: !hasCSRFToken ? "high" : undefined,
      description: hasCSRFToken
        ? `${mutableForms.length} formulaire(s) mutable(s) avec protection CSRF détectée.`
        : `${mutableForms.length} formulaire(s) mutable(s) sans token CSRF apparent. Risque d'attaque Cross-Site Request Forgery.`,
      recommendation: !hasCSRFToken
        ? "Ajoutez un token CSRF unique à chaque formulaire et validez-le côté serveur."
        : undefined,
    });
  }

  // Open redirect
  const redirects = html.match(/href\s*=\s*["'][^"']*[?&](url|redirect|next|return|goto|redir)=/gi) || [];
  if (redirects.length > 0) {
    checks.push({
      id: "open-redirect",
      category: "xss",
      name: "Redirections ouvertes potentielles",
      status: "warn",
      severity: "medium",
      description: `${redirects.length} lien(s) avec paramètres de redirection détecté(s).`,
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

async function checkWordPress(baseUrl: string, html: string): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  const origin = new URL(baseUrl).origin;
  const lower = html.toLowerCase();

  // Only run if WordPress is detected
  const isWP =
    lower.includes("wp-content") ||
    lower.includes("wp-includes") ||
    lower.includes("wordpress");
  if (!isWP) return checks;

  checks.push({
    id: "wp-detected",
    category: "wordpress",
    name: "WordPress détecté",
    status: "info",
    description: "Ce site utilise WordPress. Des vérifications spécifiques vont être effectuées.",
  });

  // ── WordPress Version Exposure ──
  const wpVersionMeta = html.match(/content="WordPress\s+([\d.]+)"/i);
  const wpVersionGen = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["'][^"']*WordPress\s+([\d.]+)/i);
  const wpVersion = wpVersionMeta?.[1] || wpVersionGen?.[1];

  checks.push({
    id: "wp-version",
    category: "wordpress",
    name: "Version WordPress exposée",
    status: wpVersion ? "fail" : "pass",
    severity: wpVersion ? "high" : undefined,
    description: wpVersion
      ? `WordPress ${wpVersion} détecté dans le code source. Les attaquants peuvent cibler les vulnérabilités connues de cette version.`
      : "La version WordPress n'est pas exposée dans le code source.",
    value: wpVersion || undefined,
    recommendation: wpVersion
      ? `Masquez la version WordPress :\n\n// functions.php\nremove_action('wp_head', 'wp_generator');\nadd_filter('the_generator', '__return_empty_string');`
      : undefined,
  });

  // ── readme.html ──
  const readmeRes = await safeFetch(`${origin}/readme.html`, { timeout: 3000 });
  if (readmeRes?.ok) {
    const readmeBody = await readmeRes.text().catch(() => "");
    const isRealReadme = /wordpress/i.test(readmeBody) && /<html/i.test(readmeBody);
    if (isRealReadme) {
      checks.push({
        id: "wp-readme",
        category: "wordpress",
        name: "readme.html accessible",
        status: "warn",
        severity: "medium",
        description: "Le fichier readme.html WordPress est accessible. Il peut révéler la version installée.",
        value: `${origin}/readme.html`,
        recommendation: `Supprimez ou bloquez l'accès :\n\n# .htaccess\n<Files readme.html>\n  Order Allow,Deny\n  Deny from all\n</Files>\n\n# Ou Nginx\nlocation = /readme.html { deny all; }`,
      });
    }
  }

  // ── XML-RPC ──
  const xmlrpcRes = await safeFetch(`${origin}/xmlrpc.php`, { method: "POST", timeout: 3000 });
  if (xmlrpcRes?.ok) {
    const xmlrpcBody = await xmlrpcRes.text().catch(() => "");
    if (/XML-RPC server accepts POST requests only/i.test(xmlrpcBody) || xmlrpcRes.status === 405) {
      checks.push({
        id: "wp-xmlrpc",
        category: "wordpress",
        name: "XML-RPC actif",
        status: "fail",
        severity: "high",
        description: "XML-RPC est accessible. Vecteur de brute-force, DDoS amplification, et pingback abuse.",
        value: `${origin}/xmlrpc.php`,
        recommendation: `Désactivez XML-RPC :\n\n// functions.php\nadd_filter('xmlrpc_enabled', '__return_false');\n\n# .htaccess\n<Files xmlrpc.php>\n  Order Allow,Deny\n  Deny from all\n</Files>\n\n# Ou mieux : plugin "Disable XML-RPC"`,
      });
    }
  }

  // ── Author Enumeration (?author=1) ──
  const authorRes = await safeFetch(`${origin}/?author=1`, { method: "GET", redirect: "manual", timeout: 3000 });
  if (authorRes) {
    const location = authorRes.headers.get("location") || "";
    const exposesAuthor =
      (authorRes.status >= 300 && authorRes.status < 400 && /\/author\//i.test(location)) ||
      authorRes.status === 200;
    if (exposesAuthor) {
      const authorName = location.match(/\/author\/([^/]+)/)?.[1] || "détecté";
      checks.push({
        id: "wp-author-enum",
        category: "wordpress",
        name: "Énumération des auteurs",
        status: "warn",
        severity: "medium",
        description: `L'énumération des auteurs est possible (${authorName !== "détecté" ? `auteur: ${authorName}` : "redirection vers /author/"}). Les noms d'utilisateur peuvent être découverts.`,
        value: `${origin}/?author=1 → ${location || "200 OK"}`,
        recommendation: `Bloquez l'énumération des auteurs :\n\n# .htaccess\nRewriteEngine On\nRewriteCond %{QUERY_STRING} ^author=([0-9]*)\nRewriteRule .* - [F]\n\n// Ou dans functions.php :\nif (!is_admin() && isset($_GET['author'])) {\n  wp_redirect(home_url(), 301);\n  exit;\n}`,
      });
    }
  }

  // ── REST API Users Endpoint ──
  const restUsersRes = await safeFetch(`${origin}/wp-json/wp/v2/users`, { timeout: 3000 });
  if (restUsersRes?.ok) {
    const usersBody = await restUsersRes.text().catch(() => "");
    if (/^\s*\[[\s\S]*"slug"\s*:/i.test(usersBody.substring(0, 5000))) {
      try {
        const users = JSON.parse(usersBody);
        const slugs = Array.isArray(users) ? users.map((u: { slug: string }) => u.slug).slice(0, 5) : [];
        checks.push({
          id: "wp-rest-users",
          category: "wordpress",
          name: "API REST — Utilisateurs exposés",
          status: "fail",
          severity: "high",
          description: `L'API REST WordPress expose les utilisateurs publiquement.${slugs.length > 0 ? ` Utilisateurs trouvés: ${slugs.join(", ")}` : ""}`,
          value: `${origin}/wp-json/wp/v2/users`,
          recommendation: `Bloquez l'API REST pour les non-authentifiés :\n\n// functions.php\nadd_filter('rest_authentication_errors', function($result) {\n  if (!is_user_logged_in()) {\n    return new WP_Error('rest_forbidden', 'REST API restricted.', ['status' => 401]);\n  }\n  return $result;\n});\n\n// Ou plugin : "Disable REST API"`,
        });
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

  // ── debug.log exposure ──
  const debugLogPaths = ["/wp-content/debug.log", "/debug.log"];
  for (const path of debugLogPaths) {
    const debugRes = await safeFetch(`${origin}${path}`, { timeout: 3000 });
    if (debugRes?.ok) {
      const debugBody = await debugRes.text().catch(() => "");
      const contentType = debugRes.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && (debugBody.includes("PHP") || debugBody.includes("Warning") || debugBody.includes("Fatal error") || debugBody.includes("Stack trace"))) {
        checks.push({
          id: "wp-debug-log",
          category: "wordpress",
          name: "debug.log exposé",
          status: "fail",
          severity: "critical",
          description: `Le fichier ${path} est accessible publiquement ! Il contient des erreurs PHP, chemins serveur, et potentiellement des données sensibles.`,
          value: `${origin}${path}`,
          recommendation: `Bloquez immédiatement l'accès :\n\n# .htaccess\n<Files debug.log>\n  Order Allow,Deny\n  Deny from all\n</Files>\n\n// Désactivez le debug en production :\n// wp-config.php\ndefine('WP_DEBUG', false);\ndefine('WP_DEBUG_LOG', false);`,
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

  // ── Login page protection ──
  const loginRes = await safeFetch(`${origin}/wp-login.php`, { method: "GET", redirect: "follow", timeout: 5000 });
  if (loginRes?.ok) {
    const loginBody = await loginRes.text().catch(() => "");
    if (/name="log"[\s\S]*name="pwd"|wp-login\.php\?action=/i.test(loginBody)) {
      checks.push({
        id: "wp-login",
        category: "wordpress",
        name: "Page de connexion WordPress",
        status: "warn",
        severity: "medium",
        description: "La page wp-login.php est accessible à l'URL par défaut. Cible privilégiée pour les attaques brute-force.",
        value: `${origin}/wp-login.php`,
        recommendation: `Protégez la page de connexion :\n\n1. Déplacez l'URL : plugin "WPS Hide Login"\n2. Limitez les tentatives : plugin "Limit Login Attempts Reloaded"\n3. Ajoutez un captcha : plugin "reCaptcha by BestWebSoft"\n4. IP whitelisting :\n\n# .htaccess\n<Files wp-login.php>\n  Order Deny,Allow\n  Deny from all\n  Allow from YOUR_IP\n</Files>`,
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

  // HTML size
  const htmlSize = new Blob([html]).size;
  const htmlSizeKB = Math.round(htmlSize / 1024);
  checks.push({
    id: "html-size",
    category: "performance",
    name: "Taille du HTML",
    status: htmlSizeKB < 100 ? "pass" : htmlSizeKB < 500 ? "warn" : "fail",
    severity: htmlSizeKB >= 500 ? "medium" : undefined,
    description: `Page HTML : ${htmlSizeKB} Ko.${htmlSizeKB < 100 ? " Optimal." : htmlSizeKB < 500 ? " Acceptable." : " Trop volumineux."}`,
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

    // Run all checks in parallel where possible
    const [sslChecks, owaspChecks, infraChecks, incidentChecks, rgpdChecks, wpChecks] = await Promise.all([
      checkSSL(targetUrl, isHttps),
      checkOWASP(targetUrl, html),
      checkInfrastructure(targetUrl, headers),
      checkIncidentResponse(targetUrl, headers, html),
      checkRGPD(html, targetUrl),
      checkWordPress(targetUrl, html),
    ]);

    const allChecks: AuditCheck[] = [
      ...sslChecks,
      ...checkSecurityHeaders(headers),
      ...checkInfoLeakage(headers),
      ...checkCookies(headers),
      ...owaspChecks,
      ...infraChecks,
      ...rgpdChecks,
      ...checkXSSVectors(html),
      ...incidentChecks,
      ...checkPerformance(headers, html, responseTime),
      ...wpChecks,
    ];

    const technologies = detectTechnologies(headers, html);
    const { score, grade, status, categoryScores } = calculateScore(allChecks);

    const result: AuditResult = {
      url: targetUrl,
      timestamp: new Date().toISOString(),
      score,
      grade,
      status,
      checks: allChecks,
      categoryScores,
      responseTime,
      tlsInfo: { secure: isHttps },
      technologies,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Security Audit] Error:", error);
    return NextResponse.json(
      { error: "Impossible d'analyser ce site. Vérifiez l'URL et réessayez." },
      { status: 500 }
    );
  }
}
