import type { StackInfo, ThreatVector } from "@/types/audit";

export function detectStack(html: string, headers: Headers, technologies: string[]): StackInfo {
  const server = (headers.get("server") || "").toLowerCase();
  const poweredBy = (headers.get("x-powered-by") || "").toLowerCase();

  let frontend: string | null = null;
  if (/__next|_next\/static/.test(html) || technologies.includes("Next.js")) frontend = "Next.js";
  else if (/__nuxt/.test(html) || technologies.includes("Nuxt.js")) frontend = "Nuxt";
  else if (technologies.includes("Gatsby")) frontend = "Gatsby";
  else if (technologies.includes("SvelteKit") || /sveltekit/i.test(html)) frontend = "SvelteKit";
  else if (technologies.includes("Remix") || /__remix/i.test(html)) frontend = "Remix";
  else if (technologies.includes("Astro") || /astro-island/.test(html)) frontend = "Astro";

  let backend: string | null = null;
  if (poweredBy.includes("express")) backend = "Node (Express)";
  else if (poweredBy.includes("php")) backend = "PHP";
  else if (poweredBy.includes("asp.net")) backend = "ASP.NET";
  else if (/laravel/i.test(html)) backend = "Laravel";
  else if (/django/i.test(html) || /csrfmiddlewaretoken/.test(html)) backend = "Django";
  else if (/rails/i.test(html) || /authenticity_token/.test(html)) backend = "Ruby on Rails";

  let cms: string | null = null;
  if (/api\.w\.org/.test(html) || /wp-content\/(?:themes|plugins)/.test(html)) cms = "WordPress";
  else if (/joomla|joomla-script-options/i.test(html)) cms = "Joomla";
  else if (/drupalSettings|Drupal\.behaviors/.test(html)) cms = "Drupal";
  else if (/cdn\.shopify\.com|Shopify\.theme/.test(html)) cms = "Shopify";
  else if (/prestashop/i.test(html)) cms = "PrestaShop";

  let hosting: string | null = null;
  if (headers.get("cf-ray") || server.includes("cloudflare")) hosting = "Cloudflare";
  else if (headers.get("x-vercel-id") || server.includes("vercel")) hosting = "Vercel";
  else if (headers.get("x-nf-request-id") || server.includes("netlify")) hosting = "Netlify";
  else if (headers.get("x-amz-cf-id")) hosting = "CloudFront";
  else if (headers.get("fastly-debug-digest")) hosting = "Fastly";
  else if (headers.get("x-github-request-id")) hosting = "GitHub Pages";

  let serverName: string | null = null;
  if (server.includes("nginx")) serverName = "Nginx";
  else if (server.includes("apache")) serverName = "Apache";
  else if (server.includes("litespeed")) serverName = "LiteSpeed";
  else if (server.includes("caddy")) serverName = "Caddy";
  else if (server.includes("iis")) serverName = "IIS";

  let database: string | null = null;
  if (/supabase\.co|supabase\.io/.test(html)) database = "Supabase";
  else if (/firebase/.test(html) || /firestore/.test(html)) database = "Firebase";
  else if (/apollographql/.test(html)) database = "GraphQL (Apollo)";

  // Primary framework = main axis for remediation targeting
  const primaryFramework = cms || frontend || backend || serverName;

  return { frontend, backend, cms, hosting, server: serverName, database, primaryFramework };
}

// =============================================================================
// THREAT MODEL — stack-specific top attack vectors
// =============================================================================

interface ThreatTemplate extends Omit<ThreatVector, "relatedCheckIds"> {
  relatedCheckIds: string[];
  appliesTo: (stack: StackInfo) => boolean;
}

const THREAT_TEMPLATES: ThreatTemplate[] = [
  {
    id: "wp-brute-force-login",
    title: "Brute-force sur /wp-login.php",
    description: "Les bots ciblent massivement l'URL par défaut de connexion WordPress pour tenter des combinaisons de mots de passe.",
    severity: "high",
    relatedCheckIds: ["wp-login", "rate-limit"],
    mitigations: [
      "Installer 'Limit Login Attempts Reloaded' ou 'WPS Hide Login'",
      "Activer un WAF (Cloudflare, Sucuri) avec règle anti-brute-force",
      "Imposer un captcha sur la page de connexion",
    ],
    appliesTo: (s) => s.cms === "WordPress",
  },
  {
    id: "wp-plugin-cve",
    title: "Exploitation de plugins WordPress vulnérables",
    description: "Les plugins tiers sont le premier vecteur d'attaque sur WordPress. Les CVE publiées sont exploitées automatiquement dans les 48 h.",
    severity: "critical",
    relatedCheckIds: ["wp-plugins", "cms-outdated"],
    mitigations: [
      "Auto-update activé sur TOUS les plugins",
      "Scan régulier via WPScan (wpscan --url site.com)",
      "Supprimer les plugins inactifs ou non-maintenus depuis >12 mois",
    ],
    appliesTo: (s) => s.cms === "WordPress",
  },
  {
    id: "wp-xmlrpc-pingback",
    title: "Amplification DDoS via XML-RPC pingback",
    description: "XML-RPC peut être utilisé comme amplificateur DDoS (pingback.ping) et comme vecteur de brute-force distribué.",
    severity: "high",
    relatedCheckIds: ["wp-xmlrpc"],
    mitigations: [
      "Désactiver XML-RPC : add_filter('xmlrpc_enabled', '__return_false')",
      "Bloquer /xmlrpc.php au niveau serveur ou WAF",
    ],
    appliesTo: (s) => s.cms === "WordPress",
  },
  {
    id: "nextjs-middleware-bypass",
    title: "Contournement de middleware Next.js",
    description: "Les middlewares Next.js s'exécutent en edge — une erreur de configuration (matcher manquant) peut laisser des routes sensibles exposées.",
    severity: "high",
    relatedCheckIds: ["csp", "hsts"],
    mitigations: [
      "Auditer les `config.matcher` de tous les middlewares",
      "Centraliser la validation d'auth dans un middleware global (`middleware.ts` racine)",
      "Tester les routes sensibles avec un token invalide",
    ],
    appliesTo: (s) => s.frontend === "Next.js",
  },
  {
    id: "nextjs-server-actions-csrf",
    title: "CSRF sur Server Actions",
    description: "Les Server Actions Next.js sont vulnérables si l'origine n'est pas validée. Sans SameSite strict + header Origin check, un site tiers peut forger des mutations.",
    severity: "medium",
    relatedCheckIds: ["csrf", "cookie-cookies"],
    mitigations: [
      "Valider `request.headers.get('origin')` dans chaque Server Action critique",
      "Cookies de session en `SameSite=Lax` minimum, `Strict` si possible",
      "Configurer `allowedOrigins` dans next.config si déployé en multi-domaine",
    ],
    appliesTo: (s) => s.frontend === "Next.js",
  },
  {
    id: "supabase-rls-bypass",
    title: "Contournement des Row Level Security policies Supabase",
    description: "Si la clé `service_role` fuit côté client ou si les politiques RLS sont trop permissives (role:authenticated avec USING(true)), n'importe quel utilisateur lit tout.",
    severity: "critical",
    relatedCheckIds: ["secret-supabase-service"],
    mitigations: [
      "Vérifier qu'AUCUNE clé service_role n'est exposée côté frontend (scan régulier)",
      "Audit des policies RLS : `SELECT * FROM pg_policies` — aucune policy avec `USING (true)` sur données privées",
      "Rotate `service_role` à chaque fois qu'elle a transité hors environnement serveur",
    ],
    appliesTo: (s) => s.database === "Supabase",
  },
  {
    id: "php-rce-file-upload",
    title: "RCE via upload de fichier PHP",
    description: "Un endpoint d'upload mal configuré (accepte .php, .phtml) permet l'exécution de code arbitraire.",
    severity: "critical",
    relatedCheckIds: ["dir-listing", "owasp-sensitive-files"],
    mitigations: [
      "Whitelist stricte des extensions (JAMAIS de blacklist)",
      "Stocker les uploads hors du DocumentRoot ou via CDN",
      "Désactiver l'exécution PHP dans /uploads via .htaccess : `php_flag engine off`",
    ],
    appliesTo: (s) => s.backend === "PHP" || s.cms === "WordPress" || s.cms === "Drupal" || s.cms === "Joomla",
  },
  {
    id: "shopify-theme-xss",
    title: "XSS via Liquid dans un thème Shopify customisé",
    description: "Les thèmes personnalisés qui utilisent `{{ ... }}` sur des inputs non-échappés (query params, search) sont vulnérables aux XSS réfléchies.",
    severity: "medium",
    relatedCheckIds: ["csp", "x-frame"],
    mitigations: [
      "Toujours utiliser `{{ ... | escape }}` sur les inputs utilisateur",
      "Activer une CSP stricte via `<meta http-equiv='Content-Security-Policy'>`",
    ],
    appliesTo: (s) => s.cms === "Shopify",
  },
  {
    id: "drupal-drupalgeddon",
    title: "Drupalgeddon (CVE-2014-3704, -2018-7600, -2019-6340)",
    description: "Série de vulnérabilités historiques Drupal menant à RCE. Les versions non patchées sont exploitées en moins de 24 h via des bots.",
    severity: "critical",
    relatedCheckIds: ["drupal-outdated", "cms-outdated"],
    mitigations: [
      "Mettre à jour vers Drupal 11.x ou au minimum la dernière 10.x LTS",
      "Installer `seckit` et `security_review`",
    ],
    appliesTo: (s) => s.cms === "Drupal",
  },
  {
    id: "generic-secret-leak",
    title: "Fuite de secrets côté client",
    description: "Une clé API (AWS, Stripe, GitHub) exposée dans le JS du navigateur donne à un attaquant les mêmes privilèges que le serveur.",
    severity: "critical",
    relatedCheckIds: ["secret-aws-access-key", "secret-stripe-live", "secret-github-pat", "secret-openai", "secret-anthropic", "secret-private-key"],
    mitigations: [
      "Révoquer immédiatement tout secret apparu dans le bundle client",
      "Centraliser les appels tiers via routes API server (proxy)",
      "Scanner le bundle en CI avec `gitleaks` ou `trufflehog`",
    ],
    appliesTo: () => true, // Universal
  },
  {
    id: "xss-via-innerhtml",
    title: "XSS stockée via manipulation DOM non-sanitisée",
    description: "`element.innerHTML = userInput` sans sanitisation permet l'injection de scripts persistants. Fréquent dans les SPAs sans CSP.",
    severity: "high",
    relatedCheckIds: ["csp", "innerhtml", "eval-usage"],
    mitigations: [
      "Remplacer `innerHTML` par `textContent` ou `createElement`",
      "Utiliser DOMPurify pour tout HTML généré à partir d'input",
      "Déployer une CSP strict-dynamic avec nonces",
    ],
    appliesTo: (s) => s.frontend !== null || s.cms !== null,
  },
  {
    id: "session-hijacking-insecure-cookie",
    title: "Vol de session via cookie non sécurisé",
    description: "Un cookie de session sans `HttpOnly` + `Secure` + `SameSite` peut être volé via XSS ou intercepté sur réseau public.",
    severity: "high",
    relatedCheckIds: ["cookie-session", "hsts"],
    mitigations: [
      "Session cookie : `Secure; HttpOnly; SameSite=Lax` minimum",
      "HSTS avec `includeSubDomains; preload`",
      "Rotate les session tokens après login/logout",
    ],
    appliesTo: () => true,
  },
];

export function buildThreatModel(stack: StackInfo, checks: { id: string; status: string }[]): ThreatVector[] {
  const checkStatusById = new Map(checks.map((c) => [c.id, c.status]));
  const applicable = THREAT_TEMPLATES.filter((t) => t.appliesTo(stack));

  // Rank by severity + whether any related check is currently failing
  const severityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const scored = applicable.map((t) => {
    const hasFailingCheck = t.relatedCheckIds.some((id) => {
      const status = checkStatusById.get(id);
      return status === "fail" || status === "warn";
    });
    return {
      threat: t,
      priority: (severityRank[t.severity] ?? 4) - (hasFailingCheck ? 10 : 0),
    };
  });
  scored.sort((a, b) => a.priority - b.priority);

  return scored.slice(0, 5).map(({ threat }) => ({
    id: threat.id,
    title: threat.title,
    description: threat.description,
    severity: threat.severity,
    relatedCheckIds: threat.relatedCheckIds,
    mitigations: threat.mitigations,
  }));
}
