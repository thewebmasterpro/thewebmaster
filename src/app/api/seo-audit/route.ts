import { NextRequest, NextResponse } from "next/server";

// =============================================================================
// SEO AUDIT API — Analyse SEO approfondie
// Technique, On-Page, Performance, Off-Page, Recommandations
// =============================================================================

interface SeoCheck {
  id: string;
  category: string;
  name: string;
  status: "pass" | "warn" | "fail" | "info";
  severity?: "critical" | "high" | "medium" | "low" | "info";
  description: string;
  value?: string;
  recommendation?: string;
}

interface SeoAuditResult {
  url: string;
  timestamp: string;
  score: number;
  grade: string;
  checks: SeoCheck[];
  responseTime: number;
  pageSize: number;
  meta: {
    title: string | null;
    description: string | null;
    canonical: string | null;
    ogImage: string | null;
    language: string | null;
  };
  headings: { tag: string; text: string }[];
  links: { internal: number; external: number; broken: number };
  images: { total: number; withAlt: number; withoutAlt: number };
  technologies: string[];
}

// Helper: safe fetch with timeout
async function safeFetch(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 8000);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch {
    return null;
  }
}

// Helper: extract text between tags
function extractTag(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

// Helper: extract meta content
function extractMeta(html: string, name: string): string | null {
  // Try name attribute
  const nameRegex = new RegExp(
    `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*/?>`,
    "i"
  );
  let match = html.match(nameRegex);
  if (match) return match[1].trim();

  // Try content before name
  const reverseRegex = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["'][^>]*/?>`,
    "i"
  );
  match = html.match(reverseRegex);
  if (match) return match[1].trim();

  // Try property attribute (Open Graph)
  const propRegex = new RegExp(
    `<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*/?>`,
    "i"
  );
  match = html.match(propRegex);
  if (match) return match[1].trim();

  const propReverseRegex = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${name}["'][^>]*/?>`,
    "i"
  );
  match = html.match(propReverseRegex);
  return match ? match[1].trim() : null;
}

// Helper: extract all attribute values
function extractAllAttributes(html: string, tag: string, attr: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*${attr}=["']([^"']*)["'][^>]*/?>`, "gi");
  const results: string[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    results.push(match[1]);
  }
  return results;
}

// Helper: extract headings
function extractHeadings(html: string): { tag: string; text: string }[] {
  const regex = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  const headings: { tag: string; text: string }[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, "").trim();
    if (text) headings.push({ tag: match[1].toUpperCase(), text });
  }
  return headings;
}

// Helper: detect technologies from HTML
function detectTechnologies(html: string, headers: Headers): string[] {
  const techs: string[] = [];
  const checks: [string, RegExp | string][] = [
    ["Next.js", /__next/],
    ["React", /react/i],
    ["Vue.js", /vue/i],
    ["Angular", /ng-version/i],
    ["WordPress", /wp-content/i],
    ["Shopify", /shopify/i],
    ["Wix", /wix\.com/i],
    ["Squarespace", /squarespace/i],
    ["jQuery", /jquery/i],
    ["Bootstrap", /bootstrap/i],
    ["Tailwind CSS", /tailwind/i],
    ["Google Analytics", /google-analytics|gtag|googletagmanager/i],
    ["Google Tag Manager", /googletagmanager\.com\/gtm/i],
    ["Facebook Pixel", /fbq\(|facebook\.net/i],
    ["Hotjar", /hotjar/i],
    ["Cloudflare", /cloudflare/i],
    ["Vercel", /vercel/i],
    ["Netlify", /netlify/i],
    ["Schema.org", /schema\.org/i],
    ["Open Graph", /og:title|og:description/i],
    ["Twitter Cards", /twitter:card/i],
    ["AMP", /ampproject\.org/i],
    ["Umami", /umami/i],
    ["Matomo", /matomo|piwik/i],
    ["Plausible", /plausible/i],
  ];

  for (const [name, pattern] of checks) {
    if (pattern instanceof RegExp ? pattern.test(html) : html.includes(pattern)) {
      techs.push(name);
    }
  }

  const server = headers.get("server");
  if (server) {
    if (/nginx/i.test(server)) techs.push("Nginx");
    if (/apache/i.test(server)) techs.push("Apache");
    if (/cloudflare/i.test(server) && !techs.includes("Cloudflare")) techs.push("Cloudflare");
  }

  const poweredBy = headers.get("x-powered-by");
  if (poweredBy) {
    if (/express/i.test(poweredBy)) techs.push("Express.js");
    if (/php/i.test(poweredBy)) techs.push("PHP");
    if (/asp\.net/i.test(poweredBy)) techs.push("ASP.NET");
  }

  return [...new Set(techs)];
}

// =============================================================================
// 1. ANALYSE TECHNIQUE
// =============================================================================

async function checkTechnical(
  targetUrl: string,
  html: string,
  headers: Headers,
  responseTime: number,
  isHttps: boolean
): Promise<SeoCheck[]> {
  const checks: SeoCheck[] = [];
  const baseUrl = new URL(targetUrl);

  // HTTPS
  checks.push({
    id: "tech-https",
    category: "technical",
    name: "HTTPS",
    status: isHttps ? "pass" : "fail",
    severity: isHttps ? "info" : "critical",
    description: isHttps ? "Le site utilise HTTPS" : "Le site n'utilise pas HTTPS",
    value: targetUrl,
    recommendation: isHttps ? undefined : "Migrez vers HTTPS. C'est un facteur de ranking Google et essentiel pour la confiance.",
  });

  // Response time (Core Web Vitals - TTFB proxy)
  const ttfbStatus = responseTime < 800 ? "pass" : responseTime < 1800 ? "warn" : "fail";
  checks.push({
    id: "tech-ttfb",
    category: "technical",
    name: "Temps de reponse serveur (TTFB)",
    status: ttfbStatus,
    severity: ttfbStatus === "fail" ? "high" : ttfbStatus === "warn" ? "medium" : "info",
    description: `Temps de reponse : ${responseTime}ms`,
    value: `${responseTime}ms`,
    recommendation: ttfbStatus !== "pass"
      ? "Optimisez le TTFB : cache serveur, CDN, optimisation base de donnees, upgrade hosting."
      : undefined,
  });

  // Page size
  const pageSize = new Blob([html]).size;
  const pageSizeKB = Math.round(pageSize / 1024);
  const sizeStatus = pageSizeKB < 100 ? "pass" : pageSizeKB < 300 ? "warn" : "fail";
  checks.push({
    id: "tech-pagesize",
    category: "technical",
    name: "Taille de la page HTML",
    status: sizeStatus,
    severity: sizeStatus === "fail" ? "medium" : "info",
    description: `Taille HTML : ${pageSizeKB} KB`,
    value: `${pageSizeKB} KB`,
    recommendation: sizeStatus !== "pass"
      ? "Reduisez la taille HTML : minification, suppression du code inutile, lazy loading."
      : undefined,
  });

  // Compression
  const encoding = headers.get("content-encoding");
  const hasCompression = encoding && /gzip|br|deflate/i.test(encoding);
  checks.push({
    id: "tech-compression",
    category: "technical",
    name: "Compression (Gzip/Brotli)",
    status: hasCompression ? "pass" : "warn",
    severity: hasCompression ? "info" : "medium",
    description: hasCompression
      ? `Compression active : ${encoding}`
      : "Aucune compression detectee",
    value: encoding || "Aucune",
    recommendation: hasCompression
      ? undefined
      : "Activez la compression Gzip ou Brotli sur votre serveur pour reduire la taille des transferts.",
  });

  // Sitemap.xml
  const sitemapUrl = `${baseUrl.origin}/sitemap.xml`;
  const sitemapRes = await safeFetch(sitemapUrl, { timeout: 5000 });
  const hasSitemap = sitemapRes && sitemapRes.ok;
  checks.push({
    id: "tech-sitemap",
    category: "technical",
    name: "Sitemap XML",
    status: hasSitemap ? "pass" : "fail",
    severity: hasSitemap ? "info" : "high",
    description: hasSitemap
      ? "Sitemap.xml accessible"
      : "Sitemap.xml introuvable",
    value: sitemapUrl,
    recommendation: hasSitemap
      ? undefined
      : "Creez un sitemap.xml et soumettez-le a Google Search Console. Indispensable pour l'indexation.",
  });

  // Robots.txt
  const robotsUrl = `${baseUrl.origin}/robots.txt`;
  const robotsRes = await safeFetch(robotsUrl, { timeout: 5000 });
  const hasRobots = robotsRes && robotsRes.ok;
  let robotsContent = "";
  if (hasRobots) {
    robotsContent = await robotsRes.text();
  }
  const blocksAll = robotsContent.includes("Disallow: /") && !robotsContent.includes("Disallow: /\n");
  checks.push({
    id: "tech-robots",
    category: "technical",
    name: "Robots.txt",
    status: hasRobots ? (blocksAll ? "warn" : "pass") : "warn",
    severity: blocksAll ? "high" : hasRobots ? "info" : "medium",
    description: hasRobots
      ? blocksAll
        ? "Robots.txt bloque potentiellement l'indexation"
        : "Robots.txt present et accessible"
      : "Robots.txt introuvable",
    value: hasRobots ? robotsContent.substring(0, 200) : "Non trouve",
    recommendation: !hasRobots
      ? "Ajoutez un fichier robots.txt pour guider les crawlers."
      : blocksAll
        ? "Verifiez que votre robots.txt ne bloque pas l'indexation des pages importantes."
        : undefined,
  });

  // Canonical
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*\/?>/i)
    || html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["'][^>]*\/?>/i);
  const canonical = canonicalMatch ? canonicalMatch[1] : null;
  checks.push({
    id: "tech-canonical",
    category: "technical",
    name: "Balise Canonical",
    status: canonical ? "pass" : "warn",
    severity: canonical ? "info" : "medium",
    description: canonical
      ? "Balise canonical presente"
      : "Aucune balise canonical detectee",
    value: canonical || "Absente",
    recommendation: canonical
      ? undefined
      : "Ajoutez une balise <link rel='canonical'> pour eviter le contenu duplique.",
  });

  // Mobile viewport
  const hasViewport = /name=["']viewport["']/i.test(html);
  const viewportContent = extractMeta(html, "viewport");
  checks.push({
    id: "tech-viewport",
    category: "technical",
    name: "Balise Viewport (Mobile-Friendly)",
    status: hasViewport ? "pass" : "fail",
    severity: hasViewport ? "info" : "critical",
    description: hasViewport
      ? "Meta viewport presente"
      : "Meta viewport absente — le site n'est pas mobile-friendly",
    value: viewportContent || "Absente",
    recommendation: hasViewport
      ? undefined
      : "Ajoutez <meta name='viewport' content='width=device-width, initial-scale=1'> pour le responsive.",
  });

  // Structured Data (Schema.org / JSON-LD)
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const hasJsonLd = jsonLdMatches && jsonLdMatches.length > 0;
  let schemaTypes: string[] = [];
  if (hasJsonLd) {
    for (const block of jsonLdMatches!) {
      const content = block.replace(/<[^>]*>/g, "");
      try {
        const parsed = JSON.parse(content);
        if (parsed["@type"]) schemaTypes.push(parsed["@type"]);
        if (Array.isArray(parsed["@graph"])) {
          for (const item of parsed["@graph"]) {
            if (item["@type"]) schemaTypes.push(item["@type"]);
          }
        }
      } catch {}
    }
  }
  checks.push({
    id: "tech-structured-data",
    category: "technical",
    name: "Donnees structurees (Schema.org)",
    status: hasJsonLd ? "pass" : "warn",
    severity: hasJsonLd ? "info" : "medium",
    description: hasJsonLd
      ? `${jsonLdMatches!.length} bloc(s) JSON-LD detecte(s)`
      : "Aucune donnee structuree JSON-LD detectee",
    value: schemaTypes.length > 0 ? schemaTypes.join(", ") : "Aucun",
    recommendation: hasJsonLd
      ? undefined
      : "Ajoutez des donnees structurees (JSON-LD) pour ameliorer les Rich Snippets dans les SERP.",
  });

  // Language / hreflang
  const langMatch = html.match(/<html[^>]*lang=["']([^"']*)["']/i);
  const lang = langMatch ? langMatch[1] : null;
  const hasHreflang = /rel=["']alternate["'][^>]*hreflang/i.test(html);
  checks.push({
    id: "tech-lang",
    category: "technical",
    name: "Attribut lang & hreflang",
    status: lang ? "pass" : "warn",
    severity: lang ? "info" : "low",
    description: lang
      ? `Langue declaree : ${lang}${hasHreflang ? " + hreflang present" : ""}`
      : "Aucun attribut lang sur <html>",
    value: lang || "Non defini",
    recommendation: !lang
      ? "Ajoutez lang='fr' (ou votre langue) sur la balise <html> pour le SEO international."
      : undefined,
  });

  // Cache headers
  const cacheControl = headers.get("cache-control");
  const hasCache = cacheControl && !/no-cache|no-store/i.test(cacheControl);
  checks.push({
    id: "tech-cache",
    category: "technical",
    name: "En-tetes de cache",
    status: hasCache ? "pass" : "warn",
    severity: hasCache ? "info" : "low",
    description: hasCache
      ? `Cache-Control: ${cacheControl}`
      : "Pas de politique de cache efficace",
    value: cacheControl || "Absent",
    recommendation: hasCache
      ? undefined
      : "Configurez des en-tetes Cache-Control pour ameliorer les performances.",
  });

  return checks;
}

// =============================================================================
// 2. ANALYSE ON-PAGE
// =============================================================================

function checkOnPage(
  html: string,
  headings: { tag: string; text: string }[]
): SeoCheck[] {
  const checks: SeoCheck[] = [];

  // Title
  const title = extractTag(html, "title");
  const titleLen = title ? title.length : 0;
  const titleStatus = !title
    ? "fail"
    : titleLen < 30
      ? "warn"
      : titleLen > 60
        ? "warn"
        : "pass";
  checks.push({
    id: "onpage-title",
    category: "onpage",
    name: "Balise Title",
    status: titleStatus,
    severity: !title ? "critical" : titleStatus === "warn" ? "medium" : "info",
    description: !title
      ? "Aucune balise title detectee"
      : `Title (${titleLen} caracteres) : "${title.substring(0, 80)}${title.length > 80 ? "..." : ""}"`,
    value: title || "Absente",
    recommendation: !title
      ? "Ajoutez une balise <title> unique et optimisee (50-60 caracteres, mot-cle principal en debut)."
      : titleLen < 30
        ? "Title trop court. Visez 50-60 caracteres avec le mot-cle principal en debut."
        : titleLen > 60
          ? "Title trop long (risque de troncature dans les SERP). Limitez a 60 caracteres."
          : undefined,
  });

  // Meta Description
  const metaDesc = extractMeta(html, "description");
  const descLen = metaDesc ? metaDesc.length : 0;
  const descStatus = !metaDesc
    ? "fail"
    : descLen < 120
      ? "warn"
      : descLen > 160
        ? "warn"
        : "pass";
  checks.push({
    id: "onpage-metadesc",
    category: "onpage",
    name: "Meta Description",
    status: descStatus,
    severity: !metaDesc ? "high" : descStatus === "warn" ? "medium" : "info",
    description: !metaDesc
      ? "Aucune meta description detectee"
      : `Meta description (${descLen} caracteres)`,
    value: metaDesc || "Absente",
    recommendation: !metaDesc
      ? "Ajoutez une meta description attractive (120-160 caracteres) avec un CTA clair."
      : descLen < 120
        ? "Meta description trop courte. Visez 120-160 caracteres avec un appel a l'action."
        : descLen > 160
          ? "Meta description trop longue (risque de troncature). Limitez a 160 caracteres."
          : undefined,
  });

  // H1 heading
  const h1s = headings.filter((h) => h.tag === "H1");
  const h1Status = h1s.length === 1 ? "pass" : h1s.length === 0 ? "fail" : "warn";
  checks.push({
    id: "onpage-h1",
    category: "onpage",
    name: "Balise H1",
    status: h1Status,
    severity: h1s.length === 0 ? "high" : h1Status === "warn" ? "medium" : "info",
    description:
      h1s.length === 0
        ? "Aucune balise H1 detectee"
        : h1s.length === 1
          ? `H1 : "${h1s[0].text.substring(0, 80)}"`
          : `${h1s.length} balises H1 detectees (une seule recommandee)`,
    value: h1s.map((h) => h.text).join(" | ") || "Absente",
    recommendation:
      h1s.length === 0
        ? "Ajoutez une balise H1 unique contenant le mot-cle principal."
        : h1s.length > 1
          ? "Gardez une seule H1 par page. Les autres titres doivent etre H2, H3, etc."
          : undefined,
  });

  // Heading structure
  const headingTags = headings.map((h) => h.tag);
  const hasLogicalStructure =
    headingTags.length > 0 &&
    headingTags[0] === "H1" &&
    !headingTags.some((tag, i) => {
      if (i === 0) return false;
      const prev = parseInt(headingTags[i - 1].replace("H", ""));
      const curr = parseInt(tag.replace("H", ""));
      return curr > prev + 1;
    });
  checks.push({
    id: "onpage-heading-structure",
    category: "onpage",
    name: "Structure des titres (Hn)",
    status: headings.length === 0 ? "fail" : hasLogicalStructure ? "pass" : "warn",
    severity: headings.length === 0 ? "high" : hasLogicalStructure ? "info" : "medium",
    description:
      headings.length === 0
        ? "Aucun titre detecte"
        : hasLogicalStructure
          ? `Structure logique : ${headingTags.slice(0, 10).join(" > ")}${headingTags.length > 10 ? "..." : ""}`
          : `Structure non optimale : ${headingTags.slice(0, 10).join(" > ")}`,
    value: `${headings.length} titres detectes`,
    recommendation:
      headings.length === 0
        ? "Ajoutez des titres H1-H6 pour structurer votre contenu."
        : !hasLogicalStructure
          ? "Respectez la hierarchie H1 > H2 > H3... sans sauter de niveaux."
          : undefined,
  });

  // Images - alt text
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const imgsWithAlt = imgTags.filter((img) => /alt=["'][^"']+["']/i.test(img));
  const imgsWithoutAlt = imgTags.length - imgsWithAlt.length;
  const imgStatus =
    imgTags.length === 0
      ? "info"
      : imgsWithoutAlt === 0
        ? "pass"
        : imgsWithoutAlt <= 2
          ? "warn"
          : "fail";
  checks.push({
    id: "onpage-img-alt",
    category: "onpage",
    name: "Images — Attributs Alt",
    status: imgStatus,
    severity: imgStatus === "fail" ? "high" : imgStatus === "warn" ? "medium" : "info",
    description:
      imgTags.length === 0
        ? "Aucune image detectee"
        : imgsWithoutAlt === 0
          ? `Toutes les images (${imgTags.length}) ont un attribut alt`
          : `${imgsWithoutAlt}/${imgTags.length} images sans attribut alt`,
    value: `${imgsWithAlt.length}/${imgTags.length} avec alt`,
    recommendation:
      imgsWithoutAlt > 0
        ? "Ajoutez des attributs alt descriptifs a toutes les images pour le SEO et l'accessibilite."
        : undefined,
  });

  // Image formats (WebP/AVIF detection)
  const imgSrcs = extractAllAttributes(html, "img", "src");
  const modernFormats = imgSrcs.filter((s) => /\.(webp|avif)/i.test(s));
  const hasModernFormats = modernFormats.length > 0 || imgSrcs.length === 0;
  checks.push({
    id: "onpage-img-format",
    category: "onpage",
    name: "Images — Formats modernes",
    status: imgSrcs.length === 0 ? "info" : hasModernFormats ? "pass" : "warn",
    severity: imgSrcs.length === 0 ? "info" : hasModernFormats ? "info" : "low",
    description:
      imgSrcs.length === 0
        ? "Aucune image detectee"
        : hasModernFormats
          ? `${modernFormats.length}/${imgSrcs.length} images en format moderne (WebP/AVIF)`
          : "Aucune image en format WebP ou AVIF detectee",
    value: `${modernFormats.length}/${imgSrcs.length}`,
    recommendation: !hasModernFormats
      ? "Utilisez des formats WebP ou AVIF pour reduire la taille des images (30-50% de gain)."
      : undefined,
  });

  // Internal & external links
  const allLinks = html.match(/<a[^>]*href=["']([^"']*)["'][^>]*>/gi) || [];
  const hrefs = extractAllAttributes(html, "a", "href");
  const origin = (() => {
    try {
      // We don't have the URL here, so approximate
      return "";
    } catch {
      return "";
    }
  })();
  const internalLinks = hrefs.filter(
    (h) => h.startsWith("/") || h.startsWith("#") || h.startsWith("./")
  );
  const externalLinks = hrefs.filter((h) => /^https?:\/\//i.test(h));
  checks.push({
    id: "onpage-links",
    category: "onpage",
    name: "Maillage interne & liens externes",
    status: internalLinks.length > 3 ? "pass" : internalLinks.length > 0 ? "warn" : "fail",
    severity: internalLinks.length === 0 ? "high" : internalLinks.length <= 3 ? "medium" : "info",
    description: `${internalLinks.length} liens internes, ${externalLinks.length} liens externes`,
    value: `Internes: ${internalLinks.length} | Externes: ${externalLinks.length}`,
    recommendation:
      internalLinks.length <= 3
        ? "Renforcez votre maillage interne. Ajoutez des liens vers vos pages importantes."
        : undefined,
  });

  // Open Graph tags
  const ogTitle = extractMeta(html, "og:title");
  const ogDesc = extractMeta(html, "og:description");
  const ogImage = extractMeta(html, "og:image");
  const ogCount = [ogTitle, ogDesc, ogImage].filter(Boolean).length;
  checks.push({
    id: "onpage-og",
    category: "onpage",
    name: "Open Graph (reseaux sociaux)",
    status: ogCount === 3 ? "pass" : ogCount > 0 ? "warn" : "fail",
    severity: ogCount === 0 ? "medium" : ogCount < 3 ? "low" : "info",
    description:
      ogCount === 3
        ? "Balises Open Graph completes (title, description, image)"
        : ogCount > 0
          ? `Open Graph partiel : ${ogCount}/3 balises presentes`
          : "Aucune balise Open Graph detectee",
    value: `og:title=${ogTitle ? "oui" : "non"}, og:description=${ogDesc ? "oui" : "non"}, og:image=${ogImage ? "oui" : "non"}`,
    recommendation:
      ogCount < 3
        ? "Ajoutez og:title, og:description et og:image pour optimiser le partage sur les reseaux sociaux."
        : undefined,
  });

  // Twitter Cards
  const twitterCard = extractMeta(html, "twitter:card");
  const twitterTitle = extractMeta(html, "twitter:title");
  checks.push({
    id: "onpage-twitter",
    category: "onpage",
    name: "Twitter Cards",
    status: twitterCard ? "pass" : "warn",
    severity: twitterCard ? "info" : "low",
    description: twitterCard
      ? `Twitter Card : ${twitterCard}`
      : "Aucune balise Twitter Card detectee",
    value: twitterCard || "Absente",
    recommendation: !twitterCard
      ? "Ajoutez twitter:card et twitter:title pour un meilleur affichage sur Twitter/X."
      : undefined,
  });

  // Meta robots
  const metaRobots = extractMeta(html, "robots");
  const isNoindex = metaRobots && /noindex/i.test(metaRobots);
  const isNofollow = metaRobots && /nofollow/i.test(metaRobots);
  checks.push({
    id: "onpage-meta-robots",
    category: "onpage",
    name: "Meta Robots",
    status: isNoindex ? "fail" : isNofollow ? "warn" : "pass",
    severity: isNoindex ? "critical" : isNofollow ? "high" : "info",
    description: metaRobots
      ? `Meta robots : ${metaRobots}`
      : "Aucune meta robots (indexation par defaut)",
    value: metaRobots || "Non definie (index, follow par defaut)",
    recommendation: isNoindex
      ? "ATTENTION : La page est en noindex ! Elle ne sera pas indexee par Google."
      : isNofollow
        ? "La directive nofollow empeche le suivi des liens. Verifiez si c'est intentionnel."
        : undefined,
  });

  // Content length
  const textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = textContent.split(/\s+/).length;
  const contentStatus = wordCount > 300 ? "pass" : wordCount > 100 ? "warn" : "fail";
  checks.push({
    id: "onpage-content-length",
    category: "onpage",
    name: "Longueur du contenu",
    status: contentStatus,
    severity: contentStatus === "fail" ? "high" : contentStatus === "warn" ? "medium" : "info",
    description: `Environ ${wordCount} mots de contenu textuel`,
    value: `~${wordCount} mots`,
    recommendation:
      wordCount < 300
        ? "Contenu trop fin. Visez minimum 300 mots pour les pages cles (800-1500 pour un article)."
        : undefined,
  });

  return checks;
}

// =============================================================================
// 3. ANALYSE PERFORMANCE
// =============================================================================

function checkPerformance(html: string, headers: Headers, responseTime: number, pageSize: number): SeoCheck[] {
  const checks: SeoCheck[] = [];

  // Render-blocking resources
  const blockingCss = (html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi) || []).length;
  const blockingJs = (
    html.match(/<script[^>]*src=["'][^"']*["'][^>]*>/gi) || []
  ).filter((s) => !/async|defer/i.test(s)).length;
  const blockingStatus = blockingCss + blockingJs === 0 ? "pass" : blockingCss + blockingJs <= 3 ? "warn" : "fail";
  checks.push({
    id: "perf-render-blocking",
    category: "performance",
    name: "Ressources bloquantes (render-blocking)",
    status: blockingStatus,
    severity: blockingStatus === "fail" ? "high" : blockingStatus === "warn" ? "medium" : "info",
    description: `${blockingCss} CSS + ${blockingJs} JS bloquants detectes`,
    value: `CSS: ${blockingCss}, JS sync: ${blockingJs}`,
    recommendation:
      blockingCss + blockingJs > 0
        ? "Ajoutez async/defer aux scripts et envisagez le critical CSS inline pour le above-the-fold."
        : undefined,
  });

  // Lazy loading images
  const allImgs = html.match(/<img[^>]*>/gi) || [];
  const lazyImgs = allImgs.filter((img) => /loading=["']lazy["']/i.test(img));
  const lazyStatus =
    allImgs.length === 0 ? "info" : lazyImgs.length >= allImgs.length / 2 ? "pass" : "warn";
  checks.push({
    id: "perf-lazy-loading",
    category: "performance",
    name: "Lazy Loading des images",
    status: lazyStatus,
    severity: lazyStatus === "warn" ? "low" : "info",
    description:
      allImgs.length === 0
        ? "Aucune image detectee"
        : `${lazyImgs.length}/${allImgs.length} images avec lazy loading`,
    value: `${lazyImgs.length}/${allImgs.length}`,
    recommendation:
      lazyStatus === "warn"
        ? "Ajoutez loading='lazy' aux images below-the-fold pour ameliorer le LCP."
        : undefined,
  });

  // Inline CSS size
  const inlineStyles = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  const inlineCssSize = inlineStyles.reduce((acc, s) => acc + s.length, 0);
  const inlineCssKB = Math.round(inlineCssSize / 1024);
  checks.push({
    id: "perf-inline-css",
    category: "performance",
    name: "CSS inline",
    status: inlineCssKB > 50 ? "warn" : "pass",
    severity: inlineCssKB > 50 ? "low" : "info",
    description: `${inlineCssKB} KB de CSS inline (${inlineStyles.length} blocs)`,
    value: `${inlineCssKB} KB`,
    recommendation:
      inlineCssKB > 50
        ? "Trop de CSS inline. Externalisez le CSS non-critique pour ameliorer le cache."
        : undefined,
  });

  // Preconnect / DNS prefetch
  const hasPreconnect = /rel=["'](preconnect|dns-prefetch)["']/i.test(html);
  checks.push({
    id: "perf-preconnect",
    category: "performance",
    name: "Preconnect / DNS Prefetch",
    status: hasPreconnect ? "pass" : "info",
    severity: "info",
    description: hasPreconnect
      ? "Preconnect ou DNS prefetch detectes"
      : "Aucun preconnect ou dns-prefetch detecte",
    recommendation: !hasPreconnect
      ? "Ajoutez <link rel='preconnect'> pour les domaines tiers frequents (fonts, CDN, analytics)."
      : undefined,
  });

  // Resource hints (preload)
  const hasPreload = /rel=["']preload["']/i.test(html);
  checks.push({
    id: "perf-preload",
    category: "performance",
    name: "Preload de ressources critiques",
    status: hasPreload ? "pass" : "info",
    severity: "info",
    description: hasPreload
      ? "Preload detecte pour ressources critiques"
      : "Aucun preload detecte",
    recommendation: !hasPreload
      ? "Utilisez <link rel='preload'> pour les fonts, images hero et CSS critiques."
      : undefined,
  });

  return checks;
}

// =============================================================================
// 4. ANALYSE OFF-PAGE (checks limites cote serveur)
// =============================================================================

async function checkOffPage(targetUrl: string, html: string): Promise<SeoCheck[]> {
  const checks: SeoCheck[] = [];
  const baseUrl = new URL(targetUrl);

  // Favicon
  const hasFavicon =
    /rel=["'](icon|shortcut icon|apple-touch-icon)["']/i.test(html);
  checks.push({
    id: "offpage-favicon",
    category: "offpage",
    name: "Favicon",
    status: hasFavicon ? "pass" : "warn",
    severity: hasFavicon ? "info" : "low",
    description: hasFavicon ? "Favicon detecte" : "Aucun favicon detecte",
    recommendation: !hasFavicon
      ? "Ajoutez un favicon pour la reconnaissance de marque dans les onglets et les SERP."
      : undefined,
  });

  // Social presence indicators
  const socialPatterns = [
    { name: "Facebook", pattern: /facebook\.com|fb\.com/i },
    { name: "Twitter/X", pattern: /twitter\.com|x\.com/i },
    { name: "LinkedIn", pattern: /linkedin\.com/i },
    { name: "Instagram", pattern: /instagram\.com/i },
    { name: "YouTube", pattern: /youtube\.com/i },
  ];
  const foundSocials = socialPatterns.filter((s) => s.pattern.test(html)).map((s) => s.name);
  checks.push({
    id: "offpage-social",
    category: "offpage",
    name: "Presence reseaux sociaux",
    status: foundSocials.length >= 2 ? "pass" : foundSocials.length > 0 ? "warn" : "info",
    severity: "info",
    description:
      foundSocials.length > 0
        ? `Liens detectes : ${foundSocials.join(", ")}`
        : "Aucun lien vers les reseaux sociaux detecte",
    value: foundSocials.join(", ") || "Aucun",
    recommendation:
      foundSocials.length < 2
        ? "Ajoutez des liens vers vos profils sociaux pour renforcer votre presence en ligne (E-E-A-T)."
        : undefined,
  });

  // SSL certificate info
  const isHttps = targetUrl.startsWith("https");
  checks.push({
    id: "offpage-ssl",
    category: "offpage",
    name: "Certificat SSL",
    status: isHttps ? "pass" : "fail",
    severity: isHttps ? "info" : "critical",
    description: isHttps
      ? "Connexion securisee (HTTPS)"
      : "Pas de HTTPS — impact negatif sur le SEO et la confiance",
    recommendation: !isHttps
      ? "Installez un certificat SSL (Let's Encrypt gratuit) — facteur de ranking Google."
      : undefined,
  });

  // Check for analytics
  const hasAnalytics =
    /google-analytics|gtag|googletagmanager|umami|matomo|plausible|fathom/i.test(html);
  checks.push({
    id: "offpage-analytics",
    category: "offpage",
    name: "Outil d'analytics",
    status: hasAnalytics ? "pass" : "warn",
    severity: hasAnalytics ? "info" : "medium",
    description: hasAnalytics
      ? "Outil d'analytics detecte"
      : "Aucun outil d'analytics detecte",
    recommendation: !hasAnalytics
      ? "Installez un outil d'analytics (GA4, Umami, Plausible) pour suivre vos KPIs SEO."
      : undefined,
  });

  return checks;
}

// =============================================================================
// SCORE CALCULATION
// =============================================================================

function calculateScore(checks: SeoCheck[]): { score: number; grade: string } {
  let score = 100;

  for (const check of checks) {
    if (check.status === "fail") {
      switch (check.severity) {
        case "critical":
          score -= 15;
          break;
        case "high":
          score -= 10;
          break;
        case "medium":
          score -= 5;
          break;
        case "low":
          score -= 2;
          break;
      }
    } else if (check.status === "warn") {
      switch (check.severity) {
        case "critical":
          score -= 8;
          break;
        case "high":
          score -= 5;
          break;
        case "medium":
          score -= 3;
          break;
        case "low":
          score -= 1;
          break;
      }
    }
  }

  score = Math.max(0, Math.min(100, score));

  let grade: string;
  if (score >= 90) grade = "A+";
  else if (score >= 80) grade = "A";
  else if (score >= 70) grade = "B";
  else if (score >= 55) grade = "C";
  else if (score >= 40) grade = "D";
  else grade = "F";

  return { score, grade };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL requise" }, { status: 400 });
    }

    // Normalize URL
    url = url.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    // Validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "URL invalide" }, { status: 400 });
    }

    // Block private IPs / localhost
    const hostname = targetUrl.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname === "0.0.0.0"
    ) {
      return NextResponse.json(
        { error: "Les adresses locales/privees ne sont pas autorisees" },
        { status: 400 }
      );
    }

    const isHttps = targetUrl.protocol === "https:";

    // Fetch the page
    const startTime = Date.now();
    const response = await safeFetch(targetUrl.toString(), {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SEOAuditBot/1.0; +https://thewebmaster.be)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
      },
    });
    const responseTime = Date.now() - startTime;

    if (!response) {
      return NextResponse.json(
        { error: "Impossible de joindre le site. Verifiez l'URL." },
        { status: 502 }
      );
    }

    const html = await response.text();
    const headers = response.headers;
    const pageSize = new Blob([html]).size;

    // Extract headings
    const headings = extractHeadings(html);

    // Extract image stats
    const imgTags = html.match(/<img[^>]*>/gi) || [];
    const imgsWithAlt = imgTags.filter((img) => /alt=["'][^"']+["']/i.test(img)).length;

    // Extract link stats
    const hrefs = extractAllAttributes(html, "a", "href");
    const internalLinks = hrefs.filter(
      (h) => h.startsWith("/") || h.startsWith("#") || h.startsWith("./")
    ).length;
    const externalLinks = hrefs.filter((h) => /^https?:\/\//i.test(h)).length;

    // Run all checks
    const [technicalChecks, offPageChecks] = await Promise.all([
      checkTechnical(targetUrl.toString(), html, headers, responseTime, isHttps),
      checkOffPage(targetUrl.toString(), html),
    ]);
    const onPageChecks = checkOnPage(html, headings);
    const performanceChecks = checkPerformance(html, headers, responseTime, pageSize);

    const allChecks = [
      ...technicalChecks,
      ...onPageChecks,
      ...performanceChecks,
      ...offPageChecks,
    ];

    const { score, grade } = calculateScore(allChecks);

    // Detect technologies
    const technologies = detectTechnologies(html, headers);

    const result: SeoAuditResult = {
      url: targetUrl.toString(),
      timestamp: new Date().toISOString(),
      score,
      grade,
      checks: allChecks,
      responseTime,
      pageSize,
      meta: {
        title: extractTag(html, "title"),
        description: extractMeta(html, "description"),
        canonical:
          html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)?.[1] || null,
        ogImage: extractMeta(html, "og:image"),
        language: html.match(/<html[^>]*lang=["']([^"']*)["']/i)?.[1] || null,
      },
      headings: headings.slice(0, 30),
      links: { internal: internalLinks, external: externalLinks, broken: 0 },
      images: { total: imgTags.length, withAlt: imgsWithAlt, withoutAlt: imgTags.length - imgsWithAlt },
      technologies,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("SEO Audit error:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de l'analyse" },
      { status: 500 }
    );
  }
}
