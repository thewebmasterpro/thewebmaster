import { NextRequest, NextResponse } from "next/server";

// =============================================================================
// SECURITY AUDIT API
// Analyses HTTP headers, SSL, cookies, server info leakage, etc.
// =============================================================================

interface AuditCheck {
  id: string;
  category: string;
  name: string;
  status: "pass" | "warn" | "fail" | "info";
  description: string;
  value?: string;
  recommendation?: string;
}

interface AuditResult {
  url: string;
  timestamp: string;
  score: number;
  grade: string;
  checks: AuditCheck[];
  responseTime: number;
  tlsInfo: {
    secure: boolean;
    protocol?: string;
  };
  technologies: string[];
}

function checkSecurityHeader(
  headers: Headers,
  name: string,
  id: string,
  category: string,
  displayName: string,
  recommendation: string
): AuditCheck {
  const value = headers.get(name);
  if (!value) {
    return {
      id,
      category,
      name: displayName,
      status: "fail",
      description: `L'en-tête ${name} est absent.`,
      recommendation,
    };
  }
  return {
    id,
    category,
    name: displayName,
    status: "pass",
    description: `L'en-tête ${name} est correctement configuré.`,
    value,
  };
}

function checkHSTS(headers: Headers): AuditCheck {
  const value = headers.get("strict-transport-security");
  if (!value) {
    return {
      id: "hsts",
      category: "headers",
      name: "HTTP Strict Transport Security (HSTS)",
      status: "fail",
      description: "HSTS n'est pas activé. Le site est vulnérable aux attaques de downgrade SSL.",
      recommendation: "Ajoutez l'en-tête Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
    };
  }
  const maxAge = parseInt(value.match(/max-age=(\d+)/)?.[1] || "0");
  const includesSub = value.toLowerCase().includes("includesubdomains");
  const preload = value.toLowerCase().includes("preload");

  if (maxAge < 31536000) {
    return {
      id: "hsts",
      category: "headers",
      name: "HTTP Strict Transport Security (HSTS)",
      status: "warn",
      description: `HSTS est activé mais la durée (max-age=${maxAge}) est inférieure à 1 an.`,
      value,
      recommendation: "Augmentez max-age à au moins 31536000 (1 an).",
    };
  }

  return {
    id: "hsts",
    category: "headers",
    name: "HTTP Strict Transport Security (HSTS)",
    status: includesSub && preload ? "pass" : "warn",
    description: includesSub && preload
      ? "HSTS est correctement configuré avec includeSubDomains et preload."
      : "HSTS est activé mais il manque includeSubDomains ou preload.",
    value,
    recommendation: !includesSub || !preload
      ? "Ajoutez includeSubDomains et preload pour une protection maximale."
      : undefined,
  };
}

function checkCSP(headers: Headers): AuditCheck {
  const value = headers.get("content-security-policy");
  if (!value) {
    return {
      id: "csp",
      category: "headers",
      name: "Content Security Policy (CSP)",
      status: "fail",
      description: "Aucune politique CSP définie. Le site est vulnérable aux attaques XSS.",
      recommendation: "Implémentez une Content-Security-Policy restrictive.",
    };
  }

  const hasUnsafeInline = value.includes("'unsafe-inline'");
  const hasUnsafeEval = value.includes("'unsafe-eval'");
  const hasWildcard = value.includes("* ") || value.endsWith("*");

  if (hasUnsafeEval || hasWildcard) {
    return {
      id: "csp",
      category: "headers",
      name: "Content Security Policy (CSP)",
      status: "warn",
      description: "CSP est définie mais contient des directives permissives (unsafe-eval ou wildcard).",
      value: value.length > 200 ? value.substring(0, 200) + "..." : value,
      recommendation: "Supprimez 'unsafe-eval' et les wildcards (*) de votre CSP.",
    };
  }

  return {
    id: "csp",
    category: "headers",
    name: "Content Security Policy (CSP)",
    status: hasUnsafeInline ? "warn" : "pass",
    description: hasUnsafeInline
      ? "CSP est définie mais contient 'unsafe-inline'. Préférez des nonces ou hashes."
      : "CSP est correctement configurée.",
    value: value.length > 200 ? value.substring(0, 200) + "..." : value,
    recommendation: hasUnsafeInline
      ? "Remplacez 'unsafe-inline' par des nonces ou hashes CSP."
      : undefined,
  };
}

function checkServerLeakage(headers: Headers): AuditCheck[] {
  const checks: AuditCheck[] = [];

  const server = headers.get("server");
  if (server) {
    const isDetailed = /\d/.test(server);
    checks.push({
      id: "server-header",
      category: "info-leak",
      name: "En-tête Server",
      status: isDetailed ? "warn" : "info",
      description: isDetailed
        ? `Le serveur révèle sa version : "${server}". Cela facilite les attaques ciblées.`
        : `Le serveur s'identifie comme "${server}".`,
      value: server,
      recommendation: isDetailed
        ? "Masquez la version du serveur dans la configuration."
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

  const poweredBy = headers.get("x-powered-by");
  if (poweredBy) {
    checks.push({
      id: "x-powered-by",
      category: "info-leak",
      name: "X-Powered-By",
      status: "warn",
      description: `Le site révèle sa technologie : "${poweredBy}". Cela peut aider un attaquant.`,
      value: poweredBy,
      recommendation: "Supprimez l'en-tête X-Powered-By de votre configuration serveur.",
    });
  } else {
    checks.push({
      id: "x-powered-by",
      category: "info-leak",
      name: "X-Powered-By",
      status: "pass",
      description: "L'en-tête X-Powered-By est absent.",
    });
  }

  const aspVersion = headers.get("x-aspnet-version");
  if (aspVersion) {
    checks.push({
      id: "x-aspnet-version",
      category: "info-leak",
      name: "X-AspNet-Version",
      status: "fail",
      description: `Le site expose la version ASP.NET : "${aspVersion}".`,
      value: aspVersion,
      recommendation: "Désactivez l'en-tête X-AspNet-Version.",
    });
  }

  return checks;
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
    const issues: string[] = [];

    if (!lower.includes("secure")) issues.push("Secure manquant");
    if (!lower.includes("httponly")) issues.push("HttpOnly manquant");
    if (!lower.includes("samesite")) issues.push("SameSite manquant");

    checks.push({
      id: `cookie-${name}`,
      category: "cookies",
      name: `Cookie: ${name}`,
      status: issues.length === 0 ? "pass" : issues.length >= 2 ? "fail" : "warn",
      description: issues.length === 0
        ? `Le cookie "${name}" a tous les attributs de sécurité requis.`
        : `Le cookie "${name}" a des problèmes : ${issues.join(", ")}.`,
      value: cookie.length > 150 ? cookie.substring(0, 150) + "..." : cookie,
      recommendation: issues.length > 0
        ? `Ajoutez les attributs manquants : ${issues.join(", ")}.`
        : undefined,
    });
  }

  return checks;
}

function detectTechnologies(headers: Headers, html: string): string[] {
  const techs: string[] = [];

  const server = headers.get("server")?.toLowerCase() || "";
  if (server.includes("nginx")) techs.push("Nginx");
  if (server.includes("apache")) techs.push("Apache");
  if (server.includes("cloudflare")) techs.push("Cloudflare");
  if (server.includes("vercel")) techs.push("Vercel");
  if (server.includes("netlify")) techs.push("Netlify");
  if (server.includes("litespeed")) techs.push("LiteSpeed");

  const poweredBy = headers.get("x-powered-by")?.toLowerCase() || "";
  if (poweredBy.includes("express")) techs.push("Express.js");
  if (poweredBy.includes("php")) techs.push("PHP");
  if (poweredBy.includes("asp.net")) techs.push("ASP.NET");
  if (poweredBy.includes("next.js")) techs.push("Next.js");

  const lower = html.toLowerCase();
  if (lower.includes("wp-content") || lower.includes("wp-includes")) techs.push("WordPress");
  if (lower.includes("joomla")) techs.push("Joomla");
  if (lower.includes("drupal")) techs.push("Drupal");
  if (lower.includes("shopify")) techs.push("Shopify");
  if (lower.includes("wix.com")) techs.push("Wix");
  if (lower.includes("squarespace")) techs.push("Squarespace");
  if (lower.includes("webflow")) techs.push("Webflow");
  if (lower.includes("__next") || lower.includes("_next/static")) techs.push("Next.js");
  if (lower.includes("__nuxt")) techs.push("Nuxt.js");
  if (lower.includes("gatsby")) techs.push("Gatsby");
  if (lower.includes("react")) techs.push("React");
  if (lower.includes("vue")) techs.push("Vue.js");
  if (lower.includes("angular")) techs.push("Angular");
  if (lower.includes("svelte")) techs.push("Svelte");
  if (lower.includes("jquery")) techs.push("jQuery");
  if (lower.includes("bootstrap")) techs.push("Bootstrap");
  if (lower.includes("tailwindcss") || lower.includes("tailwind")) techs.push("Tailwind CSS");
  if (lower.includes("google-analytics") || lower.includes("gtag")) techs.push("Google Analytics");
  if (lower.includes("gtm.js") || lower.includes("googletagmanager")) techs.push("Google Tag Manager");
  if (lower.includes("recaptcha")) techs.push("reCAPTCHA");
  if (lower.includes("cloudflare")) techs.push("Cloudflare");
  if (lower.includes("stripe")) techs.push("Stripe");
  if (lower.includes("hotjar")) techs.push("Hotjar");
  if (lower.includes("intercom")) techs.push("Intercom");
  if (lower.includes("crisp")) techs.push("Crisp");
  if (lower.includes("hubspot")) techs.push("HubSpot");
  if (lower.includes("matomo") || lower.includes("piwik")) techs.push("Matomo");
  if (lower.includes("plausible")) techs.push("Plausible");
  if (lower.includes("umami")) techs.push("Umami");

  // WordPress specific
  if (techs.includes("WordPress")) {
    const wpVersion = html.match(/content="WordPress\s+([\d.]+)"/i);
    if (wpVersion) techs.push(`WP v${wpVersion[1]}`);

    const plugins = html.match(/wp-content\/plugins\/([^/'"]+)/g);
    if (plugins) {
      const unique = [...new Set(plugins.map((p) => p.split("/plugins/")[1]))];
      unique.slice(0, 10).forEach((p) => techs.push(`Plugin: ${p}`));
    }

    const theme = html.match(/wp-content\/themes\/([^/'"]+)/);
    if (theme) techs.push(`Thème: ${theme[1]}`);
  }

  return [...new Set(techs)];
}

function checkAdditional(headers: Headers, html: string): AuditCheck[] {
  const checks: AuditCheck[] = [];

  // Check for mixed content indicators
  const httpResources = html.match(/http:\/\/[^"'\s]+\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)/gi);
  if (httpResources && httpResources.length > 0) {
    checks.push({
      id: "mixed-content",
      category: "ssl",
      name: "Contenu mixte (Mixed Content)",
      status: "fail",
      description: `${httpResources.length} ressource(s) chargée(s) en HTTP non sécurisé détectée(s).`,
      value: httpResources.slice(0, 3).join(", "),
      recommendation: "Migrez toutes les ressources vers HTTPS.",
    });
  } else {
    checks.push({
      id: "mixed-content",
      category: "ssl",
      name: "Contenu mixte (Mixed Content)",
      status: "pass",
      description: "Aucune ressource HTTP non sécurisée détectée.",
    });
  }

  // Check for inline event handlers (XSS vector)
  const inlineHandlers = html.match(/\son\w+\s*=/gi);
  if (inlineHandlers && inlineHandlers.length > 5) {
    checks.push({
      id: "inline-handlers",
      category: "xss",
      name: "Gestionnaires d'événements inline",
      status: "warn",
      description: `${inlineHandlers.length} gestionnaires d'événements inline détectés (onclick, onload, etc.).`,
      recommendation: "Utilisez addEventListener() au lieu des attributs inline pour réduire la surface d'attaque XSS.",
    });
  }

  // Check for forms without CSRF protection hints
  const forms = html.match(/<form[^>]*>/gi) || [];
  const formsWithoutAction = forms.filter(
    (f) => !f.includes("action") || f.includes('action=""') || f.includes("action='#'")
  );
  if (forms.length > 0) {
    checks.push({
      id: "forms",
      category: "xss",
      name: "Formulaires détectés",
      status: "info",
      description: `${forms.length} formulaire(s) détecté(s) sur la page.`,
      recommendation: forms.length > 0
        ? "Assurez-vous que tous les formulaires sont protégés par des tokens CSRF."
        : undefined,
    });
  }

  // Check for open redirect patterns in links
  const redirectPatterns = html.match(/href\s*=\s*["'][^"']*[?&](url|redirect|next|return|goto)=/gi);
  if (redirectPatterns && redirectPatterns.length > 0) {
    checks.push({
      id: "open-redirect",
      category: "misc",
      name: "Redirections ouvertes potentielles",
      status: "warn",
      description: `${redirectPatterns.length} lien(s) avec des paramètres de redirection détecté(s).`,
      recommendation: "Validez toutes les URLs de redirection côté serveur.",
    });
  }

  // Check for exposed emails
  const emails = html.match(/[\w.-]+@[\w.-]+\.\w{2,}/g);
  if (emails && emails.length > 0) {
    const unique = [...new Set(emails)];
    checks.push({
      id: "email-exposure",
      category: "info-leak",
      name: "Adresses email exposées",
      status: "info",
      description: `${unique.length} adresse(s) email visible(s) dans le code source.`,
      value: unique.slice(0, 5).join(", "),
      recommendation: "Utilisez un formulaire de contact au lieu d'exposer les emails pour limiter le spam.",
    });
  }

  // Check meta robots
  const noindex = html.match(/name\s*=\s*["']robots["'][^>]*content\s*=\s*["'][^"']*noindex/i);
  if (noindex) {
    checks.push({
      id: "noindex",
      category: "misc",
      name: "Indexation bloquée",
      status: "warn",
      description: "La balise meta robots contient 'noindex'. Le site ne sera pas indexé par Google.",
    });
  }

  return checks;
}

function calculateScore(checks: AuditCheck[]): { score: number; grade: string } {
  const scorable = checks.filter((c) => c.status !== "info");
  if (scorable.length === 0) return { score: 100, grade: "A+" };

  const passed = scorable.filter((c) => c.status === "pass").length;
  const warned = scorable.filter((c) => c.status === "warn").length;
  const score = Math.round(((passed + warned * 0.5) / scorable.length) * 100);

  let grade = "F";
  if (score >= 95) grade = "A+";
  else if (score >= 85) grade = "A";
  else if (score >= 75) grade = "B";
  else if (score >= 60) grade = "C";
  else if (score >= 40) grade = "D";

  return { score, grade };
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL manquante" }, { status: 400 });
    }

    // Normalize URL
    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    // Validate URL
    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: "URL invalide" }, { status: 400 });
    }

    const checks: AuditCheck[] = [];
    let html = "";
    let responseTime = 0;
    let isHttps = targetUrl.startsWith("https://");

    // SSL check
    if (!isHttps) {
      // Try HTTPS version
      const httpsUrl = targetUrl.replace("http://", "https://");
      try {
        await fetch(httpsUrl, { method: "HEAD", redirect: "follow" });
        isHttps = true;
        targetUrl = httpsUrl;
      } catch {
        // HTTPS not available
      }
    }

    checks.push({
      id: "ssl",
      category: "ssl",
      name: "Connexion HTTPS/SSL",
      status: isHttps ? "pass" : "fail",
      description: isHttps
        ? "Le site utilise une connexion HTTPS sécurisée."
        : "Le site n'utilise pas HTTPS. Toutes les données transitent en clair.",
      recommendation: !isHttps
        ? "Installez un certificat SSL et redirigez tout le trafic vers HTTPS."
        : undefined,
    });

    // Fetch the page
    const startTime = Date.now();
    const response = await fetch(targetUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "TheWebmaster-SecurityAudit/1.0",
        Accept: "text/html",
      },
    });
    responseTime = Date.now() - startTime;
    html = await response.text();
    const headers = response.headers;

    // Response time check
    checks.push({
      id: "response-time",
      category: "performance",
      name: "Temps de réponse",
      status: responseTime < 1000 ? "pass" : responseTime < 3000 ? "warn" : "fail",
      description: `Le serveur a répondu en ${responseTime}ms.`,
      value: `${responseTime}ms`,
      recommendation: responseTime >= 1000
        ? "Optimisez le temps de réponse serveur (caching, CDN, optimisation backend)."
        : undefined,
    });

    // HTTPS redirect check
    if (isHttps) {
      try {
        const httpUrl = targetUrl.replace("https://", "http://");
        const httpRes = await fetch(httpUrl, {
          method: "HEAD",
          redirect: "manual",
        });
        const redirectsToHttps =
          httpRes.status >= 300 &&
          httpRes.status < 400 &&
          httpRes.headers.get("location")?.startsWith("https://");

        checks.push({
          id: "http-redirect",
          category: "ssl",
          name: "Redirection HTTP → HTTPS",
          status: redirectsToHttps ? "pass" : "warn",
          description: redirectsToHttps
            ? "Le trafic HTTP est automatiquement redirigé vers HTTPS."
            : "Le site ne redirige pas automatiquement HTTP vers HTTPS.",
          recommendation: !redirectsToHttps
            ? "Configurez une redirection 301 de HTTP vers HTTPS."
            : undefined,
        });
      } catch {
        // Can't check HTTP redirect
      }
    }

    // Security headers
    checks.push(checkHSTS(headers));
    checks.push(checkCSP(headers));

    checks.push(
      checkSecurityHeader(
        headers,
        "x-content-type-options",
        "x-content-type",
        "headers",
        "X-Content-Type-Options",
        "Ajoutez l'en-tête X-Content-Type-Options: nosniff"
      )
    );

    checks.push(
      checkSecurityHeader(
        headers,
        "x-frame-options",
        "x-frame",
        "headers",
        "X-Frame-Options",
        "Ajoutez l'en-tête X-Frame-Options: DENY ou SAMEORIGIN pour prévenir le clickjacking."
      )
    );

    checks.push(
      checkSecurityHeader(
        headers,
        "referrer-policy",
        "referrer",
        "headers",
        "Referrer-Policy",
        "Ajoutez l'en-tête Referrer-Policy: strict-origin-when-cross-origin"
      )
    );

    checks.push(
      checkSecurityHeader(
        headers,
        "permissions-policy",
        "permissions",
        "headers",
        "Permissions-Policy",
        "Ajoutez l'en-tête Permissions-Policy pour contrôler l'accès aux APIs du navigateur."
      )
    );

    // X-XSS-Protection (deprecated but still relevant)
    const xss = headers.get("x-xss-protection");
    checks.push({
      id: "x-xss",
      category: "headers",
      name: "X-XSS-Protection",
      status: xss ? "pass" : "info",
      description: xss
        ? `X-XSS-Protection est défini : ${xss}`
        : "X-XSS-Protection est absent (déprécié, CSP est préféré).",
      value: xss || undefined,
    });

    // Server info leakage
    checks.push(...checkServerLeakage(headers));

    // Cookie checks
    checks.push(...checkCookies(headers));

    // Additional checks
    checks.push(...checkAdditional(headers, html));

    // Technologies
    const technologies = detectTechnologies(headers, html);

    // Calculate score
    const { score, grade } = calculateScore(checks);

    const result: AuditResult = {
      url: targetUrl,
      timestamp: new Date().toISOString(),
      score,
      grade,
      checks,
      responseTime,
      tlsInfo: {
        secure: isHttps,
      },
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
