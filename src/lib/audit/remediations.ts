import type { AuditCheck, StackInfo, StackRemediation } from "@/types/audit";

// Stack-aware remediation snippets. For each check ID, we provide PR-ready
// code for the most common stacks. The `enhanceRemediations` picks the snippet
// matching the detected primary framework.

type RemediationMap = Partial<Record<string, Partial<Record<string, StackRemediation>>>>;

const REMEDIATIONS: RemediationMap = {
  hsts: {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// next.config.ts
export default {
  async headers() {
    return [{
      source: "/:path*",
      headers: [{
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      }],
    }];
  },
};`,
    },
    Nginx: {
      stack: "Nginx",
      language: "nginx",
      code: `# /etc/nginx/sites-available/yourdomain.conf
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;`,
    },
    Apache: {
      stack: "Apache",
      language: "apache",
      code: `# .htaccess
<IfModule mod_headers.c>
  Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
</IfModule>`,
    },
    WordPress: {
      stack: "WordPress",
      language: "php",
      code: `// functions.php (theme) or custom mu-plugin
add_action('send_headers', function () {
  header('Strict-Transport-Security: max-age=63072000; includeSubDomains; preload');
});`,
    },
    Laravel: {
      stack: "Laravel",
      language: "php",
      code: `// app/Http/Middleware/SecurityHeaders.php
public function handle($request, Closure $next) {
  $response = $next($request);
  $response->headers->set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  return $response;
}`,
    },
  },
  csp: {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// next.config.ts
const csp = [
  "default-src 'self'",
  "script-src 'self' 'nonce-{NONCE}' 'strict-dynamic'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
].join("; ");

export default {
  async headers() {
    return [{
      source: "/:path*",
      headers: [{ key: "Content-Security-Policy", value: csp }],
    }];
  },
};`,
      description: "Utilise des nonces générés dans middleware.ts pour les scripts inline.",
    },
    Nginx: {
      stack: "Nginx",
      language: "nginx",
      code: `add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-ancestors 'none'; base-uri 'self';" always;`,
    },
    Apache: {
      stack: "Apache",
      language: "apache",
      code: `Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-ancestors 'none'; base-uri 'self';"`,
    },
    WordPress: {
      stack: "WordPress",
      language: "php",
      code: `add_action('send_headers', function () {
  header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-ancestors 'none';");
});`,
    },
  },
  "x-frame": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// next.config.ts
headers: () => [{
  source: "/:path*",
  headers: [{ key: "X-Frame-Options", value: "DENY" }],
}]`,
    },
    Nginx: { stack: "Nginx", language: "nginx", code: `add_header X-Frame-Options "DENY" always;` },
    Apache: { stack: "Apache", language: "apache", code: `Header always set X-Frame-Options "DENY"` },
  },
  "x-content-type": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `headers: () => [{ source: "/:path*", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }] }]`,
    },
    Nginx: { stack: "Nginx", language: "nginx", code: `add_header X-Content-Type-Options "nosniff" always;` },
    Apache: { stack: "Apache", language: "apache", code: `Header always set X-Content-Type-Options "nosniff"` },
  },
  permissions: {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `headers: () => [{
  source: "/:path*",
  headers: [{
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  }],
}]`,
    },
    Nginx: {
      stack: "Nginx",
      language: "nginx",
      code: `add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()" always;`,
    },
  },
  "wp-xmlrpc": {
    WordPress: {
      stack: "WordPress",
      language: "php",
      code: `// functions.php
add_filter('xmlrpc_enabled', '__return_false');
remove_action('wp_head', 'rsd_link');`,
    },
    Nginx: {
      stack: "Nginx",
      language: "nginx",
      code: `# Block XML-RPC entirely
location = /xmlrpc.php { deny all; return 403; }`,
    },
  },
  "wp-rest-users": {
    WordPress: {
      stack: "WordPress",
      language: "php",
      code: `// functions.php
add_filter('rest_endpoints', function ($endpoints) {
  unset($endpoints['/wp/v2/users']);
  unset($endpoints['/wp/v2/users/(?P<id>[\\\\d]+)']);
  return $endpoints;
});`,
    },
  },
  "wp-login": {
    WordPress: {
      stack: "WordPress",
      language: "php",
      code: `// Install "WPS Hide Login" plugin, OR add to .htaccess:
// .htaccess (protect brute-force)
<Files wp-login.php>
  Order Deny,Allow
  Deny from all
  Allow from YOUR.OFFICE.IP.ADDRESS
</Files>`,
    },
  },
  "dir-listing": {
    Apache: { stack: "Apache", language: "apache", code: `# .htaccess\nOptions -Indexes` },
    Nginx: { stack: "Nginx", language: "nginx", code: `location / {\n  autoindex off;\n}` },
  },
  "graphql-introspection": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// apollo-server or yoga
new ApolloServer({
  introspection: process.env.NODE_ENV !== "production",
});`,
    },
  },
  "error-disclosure": {
    WordPress: {
      stack: "WordPress",
      language: "php",
      code: `// wp-config.php
define('WP_DEBUG', false);
define('WP_DEBUG_DISPLAY', false);
@ini_set('display_errors', 0);`,
    },
    Laravel: {
      stack: "Laravel",
      language: "bash",
      code: `# .env
APP_DEBUG=false
APP_ENV=production`,
    },
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// Custom error page (app/error.tsx)
"use client";
export default function GlobalError() {
  return <div>Une erreur est survenue.</div>; // no stack trace in prod
}`,
    },
  },
  "cookie-session": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// When setting session cookies (e.g. in Server Actions):
cookies().set("session", token, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
});`,
    },
    WordPress: {
      stack: "WordPress",
      language: "php",
      code: `// functions.php — forces Secure + HttpOnly + SameSite on WP login cookies
add_filter('secure_auth_cookie', '__return_true');
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.cookie_samesite', 'Lax');`,
    },
    Laravel: {
      stack: "Laravel",
      language: "php",
      code: `// config/session.php
'secure' => true,
'http_only' => true,
'same_site' => 'lax',`,
    },
  },
  "rgpd-cookies": {
    WordPress: {
      stack: "WordPress",
      language: "php",
      code: `// Install one of: Complianz, CookieYes, Tarteaucitron.
// Example Tarteaucitron bootstrap:
wp_enqueue_script('tac', 'https://cdn.jsdelivr.net/gh/AmauriC/tarteaucitron.js/tarteaucitron.min.js');
wp_add_inline_script('tac', "tarteaucitron.init({ privacyUrl: '/politique-de-confidentialite', orientation: 'bottom' });");`,
    },
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// Install a CMP: axeptio, didomi, or a lightweight custom banner.
// Ensure gtag/fbq only load AFTER consent event fires.
if (hasConsent("analytics")) {
  import("@/lib/analytics").then((m) => m.init());
}`,
    },
  },
  "http-redirect": {
    Nginx: {
      stack: "Nginx",
      language: "nginx",
      code: `server {
  listen 80;
  server_name yourdomain.com;
  return 301 https://$host$request_uri;
}`,
    },
    Apache: {
      stack: "Apache",
      language: "apache",
      code: `# .htaccess
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]`,
    },
  },
  "mixed-content": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// Add Content-Security-Policy-Report-Only to detect mixed-content sources.
headers: () => [{
  source: "/:path*",
  headers: [
    { key: "Content-Security-Policy", value: "upgrade-insecure-requests" },
  ],
}]`,
    },
    Nginx: {
      stack: "Nginx",
      language: "nginx",
      code: `add_header Content-Security-Policy "upgrade-insecure-requests" always;`,
    },
  },

  // ──────────────────────────────────────────────────────────────────────
  // SEO REMEDIATIONS
  // ──────────────────────────────────────────────────────────────────────

  "onpage-title": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// app/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Titre optimisé — 50 à 60 caractères, mot-clé principal en début",
  description: "Description engageante 120-160 caractères avec un call-to-action clair.",
};`,
    },
    WordPress: {
      stack: "WordPress",
      language: "php",
      code: `// Si vous utilisez Yoast SEO ou Rank Math : éditez les champs "SEO title"
// sur chaque page depuis l'admin WordPress.
// Alternatives : le title est généré par le thème dans <head> via wp_title() /
// get_the_title() — vérifiez que functions.php n'override pas.`,
    },
    Laravel: {
      stack: "Laravel",
      language: "php",
      code: `{{-- resources/views/layout.blade.php --}}
<title>@yield('title', 'Titre par défaut')</title>
<meta name="description" content="@yield('description', 'Description par défaut')">

{{-- resources/views/pages/accueil.blade.php --}}
@extends('layout')
@section('title', 'Titre optimisé 50-60 caractères')`,
    },
  },

  "onpage-metadesc": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// Sur les routes dynamiques, générer à partir des params :
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.slug);
  return {
    title: post.title,
    description: post.excerpt.slice(0, 160),
    openGraph: { images: [post.coverImage] },
  };
}`,
    },
  },

  "tech-canonical": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://votredomaine.com"),
  alternates: {
    canonical: "/",
  },
};

// Sur chaque page :
export const metadata: Metadata = {
  alternates: { canonical: "/articles/mon-article" },
};`,
    },
    WordPress: {
      stack: "WordPress",
      language: "php",
      code: `// Yoast SEO et Rank Math gèrent cela automatiquement.
// Sans plugin : ajouter à functions.php :
add_action('wp_head', function () {
  if (is_singular()) {
    echo '<link rel="canonical" href="' . esc_url(get_permalink()) . '">';
  }
});`,
    },
  },

  "tech-viewport": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// app/layout.tsx
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};`,
    },
  },

  "sitemap-absent": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// app/sitemap.ts
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  return [
    { url: "https://votredomaine.com", lastModified: new Date(), priority: 1 },
    ...posts.map((p) => ({
      url: \`https://votredomaine.com/blog/\${p.slug}\`,
      lastModified: p.updatedAt,
    })),
  ];
}`,
    },
    WordPress: {
      stack: "WordPress",
      language: "php",
      code: `// WordPress 5.5+ génère /wp-sitemap.xml automatiquement.
// Pour le désactiver et utiliser Yoast/Rank Math :
add_filter('wp_sitemaps_enabled', '__return_false');
// Yoast crée alors /sitemap_index.xml`,
    },
  },

  "tech-robots": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] },
    ],
    sitemap: "https://votredomaine.com/sitemap.xml",
  };
}`,
    },
  },

  "jsonld-absent": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// Dans un Server Component de page :
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: post.title,
  author: { "@type": "Person", name: post.author.name },
  datePublished: post.publishedAt,
  image: post.coverImage,
};

return (
  <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
    {/* reste de la page */}
  </>
);`,
    },
    WordPress: {
      stack: "WordPress",
      language: "php",
      code: `// Yoast SEO et Rank Math génèrent Schema Article par défaut.
// Pour enrichir avec Product / FAQ / HowTo : utilisez leur UI.`,
    },
  },

  "og-image-absent": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// app/page.tsx ou app/blog/[slug]/page.tsx
export const metadata: Metadata = {
  openGraph: {
    title: "Titre pour les partages sociaux",
    description: "Description pour OG",
    images: [{
      url: "/og-preview.jpg",
      width: 1200,
      height: 630,
      alt: "Aperçu visuel",
    }],
  },
  twitter: { card: "summary_large_image" },
};

// OU en génération dynamique via app/opengraph-image.tsx (1200×630 par défaut)`,
    },
  },

  "hreflang-absent": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// app/[locale]/layout.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    alternates: {
      canonical: \`/\${params.locale}\`,
      languages: {
        "fr-FR": "/fr",
        "en-US": "/en",
        "nl-NL": "/nl",
        "x-default": "/fr",
      },
    },
  };
}`,
    },
  },

  // ──────────────────────────────────────────────────────────────────────
  // PERFORMANCE REMEDIATIONS
  // ──────────────────────────────────────────────────────────────────────

  "cwv-lcp": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// Image LCP hero — ajoutez priority + fetchPriority="high"
import Image from "next/image";

<Image
  src="/hero.webp"
  alt="…"
  width={1200}
  height={630}
  priority               // Preload + no lazy
  fetchPriority="high"
  sizes="(max-width: 768px) 100vw, 1200px"
/>`,
    },
    WordPress: {
      stack: "WordPress",
      language: "php",
      code: `// functions.php — preload l'image LCP sur l'accueil
add_action('wp_head', function() {
  if (is_front_page()) {
    echo '<link rel="preload" as="image" href="/wp-content/uploads/hero.webp" fetchpriority="high">';
  }
}, 1);`,
    },
  },

  "cwv-cls": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// 1. Dimensions explicites sur TOUTES les images
<Image src="/photo.jpg" width={800} height={450} alt="…" />

// 2. font-display adjusted (via next/font)
import { Inter } from "next/font/google";
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,  // Évite le CLS sur le font swap
});`,
    },
  },

  "perf-blocking-scripts": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// Utiliser next/script avec strategy="afterInteractive" ou "lazyOnload"
import Script from "next/script";

<Script
  src="https://www.googletagmanager.com/gtag/js?id=G-XXX"
  strategy="afterInteractive"  // ou "lazyOnload" pour les non-critiques
/>`,
    },
    Nginx: {
      stack: "Nginx",
      language: "html",
      code: `<!-- Dans <head>, ajoutez defer ou async -->
<script src="/app.js" defer></script>
<script src="/analytics.js" async></script>`,
    },
  },

  "perf-blocking-css": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// Utiliser CSS Modules pour scoping automatique + critical CSS inlining
// Next.js inline automatiquement le critical CSS en mode production

// Pour charger un CSS non-critique sans bloquer :
<link
  rel="preload"
  href="/non-critical.css"
  as="style"
  onLoad="this.rel='stylesheet'"
/>
<noscript><link rel="stylesheet" href="/non-critical.css" /></noscript>`,
    },
    WordPress: {
      stack: "WordPress",
      language: "php",
      code: `// Plugin recommandé : Autoptimize, WP Rocket, ou LiteSpeed Cache
// Configurer : Inline Critical CSS + Defer JS + Combine

// Alternative manuelle :
add_filter('style_loader_tag', function($tag, $handle) {
  // Défère les styles non-critiques
  if (in_array($handle, ['non-critical-style'])) {
    return str_replace("rel='stylesheet'", "rel='preload' as='style' onload=\\"this.rel='stylesheet'\\"", $tag);
  }
  return $tag;
}, 10, 2);`,
    },
  },

  "perf-font-display-missing": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// Utilisez next/font (recommandé) — auto-preload + font-display: swap
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export default function Layout({ children }) {
  return <html lang="fr" className={inter.className}>{children}</html>;
}`,
    },
  },

  "perf-budget-scripts": {
    "Next.js": {
      stack: "Next.js",
      language: "bash",
      code: `# Installer le bundle analyzer
npm install -D @next/bundle-analyzer

# next.config.ts
import withBundleAnalyzer from "@next/bundle-analyzer";
export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })({});

# Lancer l'analyse
ANALYZE=true npm run build`,
    },
    WordPress: {
      stack: "WordPress",
      language: "php",
      code: `// Plugin Asset CleanUp — désactive les CSS/JS inutiles par page
// Manuel : wp_deregister_script() pour retirer les bundles qui ne servent pas

add_action('wp_enqueue_scripts', function () {
  if (!is_product()) {
    wp_deregister_script('wc-add-to-cart');
    wp_dequeue_style('woocommerce-general');
  }
}, 100);`,
    },
  },

  "perf-third-party-count": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// Déléguer les tiers à un Tag Manager unique
<Script
  src="https://www.googletagmanager.com/gtag/js"
  strategy="lazyOnload"
/>

// Widget de chat à la demande (user interaction)
const loadChat = () => {
  import("./chat-widget").then(m => m.init());
};

<button onClick={loadChat}>Besoin d'aide ?</button>`,
    },
  },

  "perf-cache-headers": {
    "Next.js": {
      stack: "Next.js",
      language: "ts",
      code: `// next.config.ts
export default {
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/(.*)\\\\.(?:png|jpg|jpeg|webp|avif|gif|svg|woff2?)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};`,
    },
    Nginx: {
      stack: "Nginx",
      language: "nginx",
      code: `location ~* \\.(js|css|png|jpg|jpeg|webp|avif|svg|woff2|ico)$ {
  expires 1y;
  add_header Cache-Control "public, max-age=31536000, immutable";
  access_log off;
}

location ~* \\.html$ {
  expires -1;
  add_header Cache-Control "no-cache, must-revalidate";
}`,
    },
    Apache: {
      stack: "Apache",
      language: "apache",
      code: `<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/avif "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

<IfModule mod_headers.c>
  Header set Cache-Control "public, max-age=31536000, immutable" "expr=%{REQUEST_URI} =~ m#\\\\.(js|css|png|jpg|webp|avif|woff2)$#"
</IfModule>`,
    },
  },
};

export function pickRemediation(checkId: string, stack: StackInfo): StackRemediation | undefined {
  const perCheck = REMEDIATIONS[checkId];
  if (!perCheck) return undefined;

  // Priority order: CMS > frontend > backend > server
  const candidates = [stack.cms, stack.frontend, stack.backend, stack.server].filter(Boolean) as string[];
  for (const candidate of candidates) {
    if (perCheck[candidate]) return perCheck[candidate];
  }
  // Fallback to any available (first entry)
  const values = Object.values(perCheck).filter(Boolean) as StackRemediation[];
  return values[0];
}

export function enhanceWithStackRemediations(checks: AuditCheck[], stack: StackInfo): AuditCheck[] {
  return checks.map((check) => {
    if (check.status === "pass" || check.status === "info") return check;
    const rem = pickRemediation(check.id, stack);
    if (!rem) return check;
    return { ...check, stackRemediation: rem };
  });
}
