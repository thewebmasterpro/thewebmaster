import { NextRequest, NextResponse } from "next/server";

// =============================================================================
// PERFORMANCE AUDIT API — Analyse de performance web approfondie
// Core Web Vitals, Resources, Optimization, Caching, Third-party
// =============================================================================

interface PerfCheck {
  id: string;
  category: string;
  name: string;
  status: "pass" | "warn" | "fail" | "info";
  severity?: "critical" | "high" | "medium" | "low" | "info";
  description: string;
  value?: string;
  recommendation?: string;
}

interface ResourceStats {
  totalScripts: number;
  syncScripts: number;
  asyncScripts: number;
  deferScripts: number;
  inlineScripts: number;
  totalStylesheets: number;
  inlineStyles: number;
  totalImages: number;
  lazyImages: number;
  totalFonts: number;
  preloadedFonts: number;
}

interface PerfAuditResult {
  url: string;
  timestamp: string;
  score: number;
  grade: string;
  checks: PerfCheck[];
  responseTime: number;
  pageSize: number;
  htmlSize: number;
  resources: ResourceStats;
  technologies: string[];
  serverInfo: {
    server: string | null;
    poweredBy: string | null;
    protocol: string | null;
    compression: string | null;
  };
  thirdPartyDomains: string[];
  estimatedLoadTime: {
    fast3g: string;
    slow3g: string;
    cable: string;
  };
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

// Helper: detect technologies
function detectTechnologies(html: string, headers: Headers): string[] {
  const techs: string[] = [];
  const checks: [string, RegExp][] = [
    ["Next.js", /__next/],
    ["React", /react/i],
    ["Vue.js", /vue/i],
    ["Angular", /ng-version/i],
    ["WordPress", /wp-content/i],
    ["Shopify", /shopify/i],
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
  ];

  for (const [name, pattern] of checks) {
    if (pattern.test(html)) techs.push(name);
  }

  const server = headers.get("server");
  if (server) {
    if (/nginx/i.test(server)) techs.push("Nginx");
    if (/apache/i.test(server)) techs.push("Apache");
    if (/cloudflare/i.test(server) && !techs.includes("Cloudflare")) techs.push("Cloudflare");
  }

  return [...new Set(techs)];
}

// Helper: detect if site uses a modern framework (Next.js, Nuxt, etc.)
function isModernFramework(html: string): boolean {
  return /__next|__nuxt|__remix|__gatsby/i.test(html);
}

// Helper: count framework data/hydration scripts (not real blocking JS)
function countFrameworkDataScripts(html: string): number {
  // Next.js RSC payloads, hydration data, flight data
  const rscScripts = html.match(/<script[^>]*>self\.__next_f\.push/gi) || [];
  const nextData = html.match(/<script[^>]*id=["']__NEXT_DATA__["']/gi) || [];
  const flightScripts = html.match(/<script[^>]*>\(self\.__next_[a-z]/gi) || [];
  return rscScripts.length + nextData.length + flightScripts.length;
}

// Helper: extract resource stats
function extractResourceStats(html: string): ResourceStats {
  const scriptTags = html.match(/<script[^>]*>/gi) || [];
  const scriptSrcs = scriptTags.filter((s) => /src=["']/i.test(s));
  const allInlineScripts = scriptTags.filter((s) => !/src=["']/i.test(s) && !/type=["']application\/(ld\+json|json)["']/i.test(s));
  // Exclude framework hydration/data scripts from inline count
  const frameworkDataCount = countFrameworkDataScripts(html);
  const inlineScripts = allInlineScripts.filter((s) =>
    !/self\.__next_f|__NEXT_DATA__|self\.__next_[a-z]/i.test(s)
  );
  const syncScripts = scriptSrcs.filter((s) => !/async|defer/i.test(s));
  const asyncScripts = scriptSrcs.filter((s) => /async/i.test(s));
  const deferScripts = scriptSrcs.filter((s) => /defer/i.test(s));

  const stylesheets = (html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi) || []);
  const inlineStyles = (html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []);

  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const lazyImgs = imgTags.filter((img) => /loading=["']lazy["']/i.test(img));

  const fontLinks = (html.match(/<link[^>]*href=["'][^"']*\.(woff2?|ttf|otf|eot)["'][^>]*>/gi) || []);
  const preloadedFonts = (html.match(/<link[^>]*rel=["']preload["'][^>]*as=["']font["'][^>]*>/gi) || []);
  const fontFaceMatches = html.match(/@font-face/gi) || [];

  return {
    totalScripts: scriptSrcs.length,
    syncScripts: syncScripts.length,
    asyncScripts: asyncScripts.length,
    deferScripts: deferScripts.length,
    inlineScripts: inlineScripts.length,
    totalStylesheets: stylesheets.length,
    inlineStyles: inlineStyles.length,
    totalImages: imgTags.length,
    lazyImages: lazyImgs.length,
    totalFonts: fontLinks.length + fontFaceMatches.length,
    preloadedFonts: preloadedFonts.length,
  };
}

// Helper: extract third-party domains
function extractThirdPartyDomains(html: string, origin: string): string[] {
  const urlRegex = /(?:src|href)=["'](https?:\/\/[^"'/]+)/gi;
  const domains = new Set<string>();
  let match;
  while ((match = urlRegex.exec(html)) !== null) {
    try {
      const u = new URL(match[1]);
      if (u.hostname !== origin) {
        domains.add(u.hostname);
      }
    } catch {}
  }
  return [...domains].sort();
}

// =============================================================================
// 1. SERVER & NETWORK
// =============================================================================

function checkServerNetwork(
  html: string,
  headers: Headers,
  responseTime: number,
  pageSize: number,
  isHttps: boolean
): PerfCheck[] {
  const checks: PerfCheck[] = [];

  // TTFB
  const ttfbStatus = responseTime < 600 ? "pass" : responseTime < 1500 ? "warn" : "fail";
  checks.push({
    id: "server-ttfb",
    category: "server",
    name: "Time to First Byte (TTFB)",
    status: ttfbStatus,
    severity: ttfbStatus === "fail" ? "critical" : ttfbStatus === "warn" ? "high" : "info",
    description: `TTFB : ${responseTime}ms${responseTime < 600 ? " — Excellent" : responseTime < 1500 ? " — A ameliorer" : " — Trop lent"}`,
    value: `${responseTime}ms`,
    recommendation: ttfbStatus !== "pass"
      ? "Optimisez le TTFB : activez le cache serveur, utilisez un CDN, optimisez les requetes base de donnees, upgrader le hosting."
      : undefined,
  });

  // HTTP/2
  checks.push({
    id: "server-https",
    category: "server",
    name: "HTTPS",
    status: isHttps ? "pass" : "fail",
    severity: isHttps ? "info" : "critical",
    description: isHttps ? "Connexion securisee HTTPS" : "Pas de HTTPS — impact performance (pas de HTTP/2 possible)",
    value: isHttps ? "Actif" : "Inactif",
    recommendation: !isHttps
      ? "Migrez vers HTTPS pour beneficier de HTTP/2 et du multiplexage des requetes."
      : undefined,
  });

  // Compression
  const encoding = headers.get("content-encoding");
  const hasBrotli = encoding && /br/i.test(encoding);
  const hasGzip = encoding && /gzip/i.test(encoding);
  const hasCompression = hasBrotli || hasGzip;
  checks.push({
    id: "server-compression",
    category: "server",
    name: "Compression (Brotli/Gzip)",
    status: hasBrotli ? "pass" : hasGzip ? "pass" : "fail",
    severity: hasCompression ? "info" : "critical",
    description: hasBrotli
      ? `Compression Brotli active — optimal`
      : hasGzip
        ? `Compression Gzip active — bon (Brotli serait meilleur)`
        : "Aucune compression detectee — transferts non optimises",
    value: encoding || "Aucune",
    recommendation: !hasCompression
      ? "Activez la compression Brotli (prefere) ou Gzip sur votre serveur. Reduction de 60-80% de la taille des transferts."
      : !hasBrotli
        ? "Passez a la compression Brotli pour 15-20% de gain supplementaire par rapport a Gzip."
        : undefined,
  });

  // Page size
  const pageSizeKB = Math.round(pageSize / 1024);
  const sizeStatus = pageSizeKB < 100 ? "pass" : pageSizeKB < 300 ? "warn" : "fail";
  checks.push({
    id: "server-pagesize",
    category: "server",
    name: "Taille de la page HTML",
    status: sizeStatus,
    severity: sizeStatus === "fail" ? "high" : sizeStatus === "warn" ? "medium" : "info",
    description: `Taille HTML : ${pageSizeKB} KB${pageSizeKB < 100 ? " — Leger" : pageSizeKB < 300 ? " — Moyen" : " — Trop lourd"}`,
    value: `${pageSizeKB} KB`,
    recommendation: sizeStatus !== "pass"
      ? "Reduisez la taille HTML : minification, suppression du code inutile, extraction du CSS/JS inline."
      : undefined,
  });

  // Cache-Control
  const cacheControl = headers.get("cache-control");
  const hasEffectiveCache = cacheControl && /max-age=\d{3,}|s-maxage|immutable/i.test(cacheControl);
  const hasNoCache = cacheControl && /no-cache|no-store/i.test(cacheControl);
  checks.push({
    id: "server-cache",
    category: "server",
    name: "Politique de cache (Cache-Control)",
    status: hasEffectiveCache ? "pass" : hasNoCache ? "warn" : cacheControl ? "warn" : "fail",
    severity: !cacheControl ? "high" : hasNoCache ? "medium" : hasEffectiveCache ? "info" : "medium",
    description: cacheControl
      ? `Cache-Control: ${cacheControl}`
      : "Aucun en-tete Cache-Control detecte",
    value: cacheControl || "Absent",
    recommendation: !hasEffectiveCache
      ? "Configurez des en-tetes Cache-Control avec max-age pour les ressources statiques (ex: max-age=31536000 pour les assets immuables)."
      : undefined,
  });

  // ETag
  const etag = headers.get("etag");
  checks.push({
    id: "server-etag",
    category: "server",
    name: "ETag (validation cache)",
    status: etag ? "pass" : "info",
    severity: "info",
    description: etag ? "En-tete ETag present — cache conditionnel actif" : "Pas d'ETag detecte",
    value: etag || "Absent",
    recommendation: !etag
      ? "Ajoutez des ETag pour permettre la validation conditionnelle du cache (304 Not Modified)."
      : undefined,
  });

  // Server header
  const server = headers.get("server");
  const xPoweredBy = headers.get("x-powered-by");
  const leaksInfo = server || xPoweredBy;
  checks.push({
    id: "server-info-leak",
    category: "server",
    name: "Fuite d'information serveur",
    status: leaksInfo ? "warn" : "pass",
    severity: leaksInfo ? "low" : "info",
    description: leaksInfo
      ? `Informations serveur exposees : ${[server, xPoweredBy].filter(Boolean).join(", ")}`
      : "Aucune information serveur exposee",
    value: [server, xPoweredBy].filter(Boolean).join(", ") || "Masque",
    recommendation: leaksInfo
      ? "Masquez les en-tetes Server et X-Powered-By pour reduire la surface d'attaque."
      : undefined,
  });

  return checks;
}

// =============================================================================
// 2. RESOURCES & LOADING
// =============================================================================

function checkResources(html: string, resources: ResourceStats): PerfCheck[] {
  const checks: PerfCheck[] = [];

  // Render-blocking scripts
  const blockingStatus = resources.syncScripts === 0 ? "pass" : resources.syncScripts <= 2 ? "warn" : "fail";
  checks.push({
    id: "res-blocking-scripts",
    category: "resources",
    name: "Scripts bloquants (render-blocking)",
    status: blockingStatus,
    severity: blockingStatus === "fail" ? "critical" : blockingStatus === "warn" ? "high" : "info",
    description: resources.syncScripts === 0
      ? `Aucun script bloquant — ${resources.asyncScripts} async, ${resources.deferScripts} defer`
      : `${resources.syncScripts} script(s) bloquant(s) le rendu`,
    value: `Sync: ${resources.syncScripts} | Async: ${resources.asyncScripts} | Defer: ${resources.deferScripts}`,
    recommendation: resources.syncScripts > 0
      ? `Ajoutez async ou defer a ${resources.syncScripts} script(s) bloquant(s). L'attribut defer est prefere car il maintient l'ordre d'execution.`
      : undefined,
  });

  // Total scripts count (excludes framework hydration/data scripts)
  const totalScripts = resources.totalScripts + resources.inlineScripts;
  const scriptsStatus = totalScripts <= 15 ? "pass" : totalScripts <= 25 ? "warn" : "fail";
  checks.push({
    id: "res-scripts-count",
    category: "resources",
    name: "Nombre total de scripts",
    status: scriptsStatus,
    severity: scriptsStatus === "fail" ? "high" : scriptsStatus === "warn" ? "medium" : "info",
    description: `${totalScripts} scripts detectes (${resources.totalScripts} externes + ${resources.inlineScripts} inline)`,
    value: `${totalScripts} scripts`,
    recommendation: totalScripts > 10
      ? "Reduisez le nombre de scripts : regroupez-les (bundling), supprimez les inutilises, chargez-les a la demande."
      : undefined,
  });

  // Stylesheets
  const totalCss = resources.totalStylesheets + resources.inlineStyles;
  const cssStatus = totalCss <= 5 ? "pass" : totalCss <= 10 ? "warn" : "fail";
  checks.push({
    id: "res-css-count",
    category: "resources",
    name: "Nombre de feuilles de styles",
    status: cssStatus,
    severity: cssStatus === "fail" ? "high" : cssStatus === "warn" ? "medium" : "info",
    description: `${totalCss} CSS detectes (${resources.totalStylesheets} externes + ${resources.inlineStyles} inline)`,
    value: `${totalCss} CSS`,
    recommendation: totalCss > 5
      ? "Reduisez les fichiers CSS : regroupez-les, utilisez le critical CSS inline + chargement async du reste."
      : undefined,
  });

  // Inline CSS size
  const inlineStyles = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []);
  const inlineCssSize = inlineStyles.reduce((acc, s) => acc + s.length, 0);
  const inlineCssKB = Math.round(inlineCssSize / 1024);
  const inlineCssStatus = inlineCssKB < 15 ? "pass" : inlineCssKB < 50 ? "warn" : "fail";
  checks.push({
    id: "res-inline-css",
    category: "resources",
    name: "Taille du CSS inline",
    status: inlineCssStatus,
    severity: inlineCssStatus === "fail" ? "medium" : inlineCssStatus === "warn" ? "low" : "info",
    description: `${inlineCssKB} KB de CSS inline (${inlineStyles.length} blocs)`,
    value: `${inlineCssKB} KB`,
    recommendation: inlineCssKB >= 15
      ? "Externalisez le CSS non-critique pour ameliorer le cache. Gardez uniquement le critical CSS inline."
      : undefined,
  });

  // Inline JS size
  const inlineJsBlocks = (html.match(/<script(?![^>]*src=)(?![^>]*type=["']application\/(ld\+json|json)["'])[^>]*>([\s\S]*?)<\/script>/gi) || []);
  const inlineJsSize = inlineJsBlocks.reduce((acc, s) => acc + s.length, 0);
  const inlineJsKB = Math.round(inlineJsSize / 1024);
  const inlineJsStatus = inlineJsKB < 10 ? "pass" : inlineJsKB < 30 ? "warn" : "fail";
  checks.push({
    id: "res-inline-js",
    category: "resources",
    name: "Taille du JavaScript inline",
    status: inlineJsStatus,
    severity: inlineJsStatus === "fail" ? "medium" : inlineJsStatus === "warn" ? "low" : "info",
    description: `${inlineJsKB} KB de JS inline (${inlineJsBlocks.length} blocs)`,
    value: `${inlineJsKB} KB`,
    recommendation: inlineJsKB >= 10
      ? "Externalisez le JavaScript inline pour beneficier du cache navigateur."
      : undefined,
  });

  return checks;
}

// =============================================================================
// 3. IMAGE OPTIMIZATION
// =============================================================================

function checkImages(html: string, resources: ResourceStats): PerfCheck[] {
  const checks: PerfCheck[] = [];

  if (resources.totalImages === 0) {
    checks.push({
      id: "img-none",
      category: "images",
      name: "Images",
      status: "info",
      severity: "info",
      description: "Aucune image detectee sur la page",
    });
    return checks;
  }

  // Lazy loading
  const lazyRatio = resources.lazyImages / resources.totalImages;
  const lazyStatus = lazyRatio >= 0.5 ? "pass" : lazyRatio > 0 ? "warn" : "fail";
  checks.push({
    id: "img-lazy",
    category: "images",
    name: "Lazy Loading des images",
    status: lazyStatus,
    severity: lazyStatus === "fail" ? "high" : lazyStatus === "warn" ? "medium" : "info",
    description: `${resources.lazyImages}/${resources.totalImages} images avec loading="lazy"`,
    value: `${resources.lazyImages}/${resources.totalImages}`,
    recommendation: lazyRatio < 0.5
      ? "Ajoutez loading='lazy' aux images below-the-fold. Gardez les images hero/above-the-fold sans lazy loading."
      : undefined,
  });

  // Modern formats (WebP/AVIF)
  // Next.js /_next/image serves WebP/AVIF via content negotiation (Accept header)
  const imgSrcs = extractAllAttributes(html, "img", "src");
  const modernFormats = imgSrcs.filter((s) => /\.(webp|avif)/i.test(s) || /\/_next\/image/i.test(s));
  const modernRatio = imgSrcs.length > 0 ? modernFormats.length / imgSrcs.length : 1;
  const formatStatus = modernRatio >= 0.5 ? "pass" : modernRatio > 0 ? "warn" : "fail";
  checks.push({
    id: "img-formats",
    category: "images",
    name: "Formats modernes (WebP/AVIF)",
    status: imgSrcs.length === 0 ? "info" : formatStatus,
    severity: formatStatus === "fail" ? "high" : formatStatus === "warn" ? "medium" : "info",
    description: `${modernFormats.length}/${imgSrcs.length} images en format moderne`,
    value: `${modernFormats.length}/${imgSrcs.length}`,
    recommendation: modernRatio < 0.5
      ? "Utilisez WebP (support universel) ou AVIF (meilleure compression) pour reduire 30-50% la taille des images."
      : undefined,
  });

  // Responsive images (srcset)
  // Next.js Image with fill uses sizes + srcset; data-nimg="fill" images are inherently responsive
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const withSrcset = imgTags.filter((img) => /srcset=/i.test(img) || /data-nimg=["']fill["']/i.test(img));
  const srcsetRatio = imgTags.length > 0 ? withSrcset.length / imgTags.length : 1;
  const srcsetStatus = srcsetRatio >= 0.5 ? "pass" : srcsetRatio > 0 ? "warn" : "fail";
  checks.push({
    id: "img-srcset",
    category: "images",
    name: "Images responsives (srcset)",
    status: srcsetStatus,
    severity: srcsetStatus === "fail" ? "medium" : srcsetStatus === "warn" ? "low" : "info",
    description: `${withSrcset.length}/${imgTags.length} images avec srcset`,
    value: `${withSrcset.length}/${imgTags.length}`,
    recommendation: srcsetRatio < 0.5
      ? "Utilisez srcset et sizes pour servir des images adaptees a chaque ecran. Evite le telechargement d'images trop grandes sur mobile."
      : undefined,
  });

  // Image dimensions
  // Next.js fill images (data-nimg="fill") use CSS-based sizing via parent container — no CLS risk
  // Next.js responsive images (data-nimg="1") have width/height in style attribute
  const withDimensions = imgTags.filter((img) =>
    (/width=/i.test(img) && /height=/i.test(img)) || /data-nimg/i.test(img)
  );
  const dimRatio = imgTags.length > 0 ? withDimensions.length / imgTags.length : 1;
  const dimStatus = dimRatio >= 0.7 ? "pass" : dimRatio > 0.3 ? "warn" : "fail";
  checks.push({
    id: "img-dimensions",
    category: "images",
    name: "Dimensions explicites (width/height)",
    status: dimStatus,
    severity: dimStatus === "fail" ? "high" : dimStatus === "warn" ? "medium" : "info",
    description: `${withDimensions.length}/${imgTags.length} images avec width et height`,
    value: `${withDimensions.length}/${imgTags.length}`,
    recommendation: dimRatio < 0.7
      ? "Ajoutez width et height a toutes les images pour eviter le Cumulative Layout Shift (CLS) — facteur Core Web Vitals."
      : undefined,
  });

  // Alt attributes
  const withAlt = imgTags.filter((img) => /alt=["'][^"']+["']/i.test(img));
  const withoutAlt = imgTags.length - withAlt.length;
  checks.push({
    id: "img-alt",
    category: "images",
    name: "Attributs alt",
    status: withoutAlt === 0 ? "pass" : withoutAlt <= 2 ? "warn" : "fail",
    severity: withoutAlt > 2 ? "medium" : withoutAlt > 0 ? "low" : "info",
    description: withoutAlt === 0
      ? `Toutes les images (${imgTags.length}) ont un attribut alt`
      : `${withoutAlt}/${imgTags.length} images sans alt`,
    value: `${withAlt.length}/${imgTags.length}`,
    recommendation: withoutAlt > 0
      ? "Ajoutez des attributs alt descriptifs — impact accessibilite et SEO."
      : undefined,
  });

  return checks;
}

// =============================================================================
// 4. FONTS & TYPOGRAPHY
// =============================================================================

function checkFonts(html: string): PerfCheck[] {
  const checks: PerfCheck[] = [];

  // Google Fonts
  const googleFonts = (html.match(/fonts\.googleapis\.com\/css2?[^"']*/gi) || []);
  const hasGoogleFonts = googleFonts.length > 0;

  // Font display
  const hasFontDisplay = /font-display:\s*(swap|optional|fallback)/i.test(html);
  const hasFontDisplayBlock = /font-display:\s*block/i.test(html);

  if (hasGoogleFonts) {
    const hasDisplayParam = googleFonts.some((f) => /display=swap|display=optional/i.test(f));
    checks.push({
      id: "font-google",
      category: "fonts",
      name: "Google Fonts optimise",
      status: hasDisplayParam ? "pass" : "warn",
      severity: hasDisplayParam ? "info" : "medium",
      description: hasDisplayParam
        ? `${googleFonts.length} Google Font(s) avec display=swap`
        : `${googleFonts.length} Google Font(s) sans display=swap`,
      value: `${googleFonts.length} font(s)`,
      recommendation: !hasDisplayParam
        ? "Ajoutez &display=swap a vos URLs Google Fonts pour eviter le FOIT (Flash of Invisible Text)."
        : undefined,
    });
  }

  // Font preloading
  const preloadedFonts = (html.match(/<link[^>]*rel=["']preload["'][^>]*as=["']font["'][^>]*>/gi) || []);
  const fontFaces = html.match(/@font-face/gi) || [];
  const hasFonts = hasGoogleFonts || fontFaces.length > 0;

  if (hasFonts) {
    checks.push({
      id: "font-preload",
      category: "fonts",
      name: "Preload des polices",
      status: preloadedFonts.length > 0 ? "pass" : "warn",
      severity: preloadedFonts.length > 0 ? "info" : "medium",
      description: preloadedFonts.length > 0
        ? `${preloadedFonts.length} police(s) preloadee(s)`
        : "Aucune police preloadee",
      value: `${preloadedFonts.length} preloadee(s)`,
      recommendation: preloadedFonts.length === 0
        ? "Preloadez vos polices critiques avec <link rel='preload' as='font' crossorigin> pour accelerer le First Contentful Paint."
        : undefined,
    });

    // Font display strategy
    checks.push({
      id: "font-display",
      category: "fonts",
      name: "Strategie font-display",
      status: hasFontDisplay ? "pass" : hasFontDisplayBlock ? "warn" : fontFaces.length > 0 ? "warn" : "info",
      severity: hasFontDisplayBlock ? "medium" : hasFontDisplay ? "info" : "low",
      description: hasFontDisplay
        ? "font-display: swap/optional/fallback detecte"
        : hasFontDisplayBlock
          ? "font-display: block detecte — risque de FOIT"
          : "Aucun font-display detecte",
      recommendation: !hasFontDisplay
        ? "Utilisez font-display: swap (ou optional pour le LCP) dans vos @font-face pour eviter le texte invisible."
        : undefined,
    });
  }

  // Preconnect to font CDN
  const hasPreconnectFonts = /rel=["']preconnect["'][^>]*href=["'][^"']*fonts/i.test(html);
  if (hasGoogleFonts) {
    checks.push({
      id: "font-preconnect",
      category: "fonts",
      name: "Preconnect vers CDN de polices",
      status: hasPreconnectFonts ? "pass" : "warn",
      severity: hasPreconnectFonts ? "info" : "low",
      description: hasPreconnectFonts
        ? "Preconnect vers le CDN de polices detecte"
        : "Pas de preconnect vers fonts.googleapis.com ou fonts.gstatic.com",
      recommendation: !hasPreconnectFonts
        ? "Ajoutez <link rel='preconnect' href='https://fonts.gstatic.com' crossorigin> pour accelerer le chargement des polices."
        : undefined,
    });
  }

  return checks;
}

// =============================================================================
// 5. RENDERING & DOM
// =============================================================================

function checkRendering(html: string): PerfCheck[] {
  const checks: PerfCheck[] = [];

  // DOM size estimation
  const tagCount = (html.match(/<[a-z][^>]*>/gi) || []).length;
  const domStatus = tagCount < 800 ? "pass" : tagCount < 1500 ? "warn" : "fail";
  checks.push({
    id: "dom-size",
    category: "rendering",
    name: "Taille du DOM",
    status: domStatus,
    severity: domStatus === "fail" ? "high" : domStatus === "warn" ? "medium" : "info",
    description: `~${tagCount} elements HTML detectes${tagCount < 800 ? " — Leger" : tagCount < 1500 ? " — Moyen" : " — Trop lourd (>1500)"}`,
    value: `~${tagCount} elements`,
    recommendation: tagCount >= 800
      ? "Reduisez la taille du DOM : simplifiez la structure, utilisez la virtualisation pour les longues listes, chargez les composants a la demande."
      : undefined,
  });

  // Deep nesting
  const depthMatches = html.match(/(<div|<section|<article|<main|<aside|<nav|<header|<footer)/gi) || [];
  const nestingLevel = depthMatches.length;
  const nestingStatus = nestingLevel < 50 ? "pass" : nestingLevel < 100 ? "warn" : "fail";
  checks.push({
    id: "dom-nesting",
    category: "rendering",
    name: "Profondeur du DOM (conteneurs)",
    status: nestingStatus,
    severity: nestingStatus === "fail" ? "medium" : nestingStatus === "warn" ? "low" : "info",
    description: `${nestingLevel} conteneurs de mise en page detectes`,
    value: `${nestingLevel} conteneurs`,
    recommendation: nestingLevel >= 50
      ? "Reduisez l'imbrication des div : simplifiez la structure HTML, utilisez CSS Grid/Flexbox au lieu de div wrappers."
      : undefined,
  });

  // Critical CSS / above-the-fold
  // Modern frameworks (Next.js, Nuxt) handle CSS extraction and injection automatically
  const headSection = html.substring(0, html.indexOf("</head>") || 5000);
  const hasInlineCriticalCss = /<style[^>]*>[\s\S]{100,}<\/style>/i.test(headSection);
  const hasFrameworkCss = isModernFramework(html) && /<link[^>]*rel=["']stylesheet["'][^>]*>/i.test(headSection);
  const hasCriticalCss = hasInlineCriticalCss || hasFrameworkCss;
  checks.push({
    id: "dom-critical-css",
    category: "rendering",
    name: "Critical CSS inline",
    status: hasCriticalCss ? "pass" : "warn",
    severity: hasCriticalCss ? "info" : "medium",
    description: hasCriticalCss
      ? hasInlineCriticalCss ? "Critical CSS inline detecte dans le <head>" : "CSS injecte dans le <head> par le framework"
      : "Pas de critical CSS inline detecte",
    recommendation: !hasCriticalCss
      ? "Injectez le CSS critique (above-the-fold) en inline dans le <head> pour accelerer le FCP."
      : undefined,
  });

  // CSS-in-JS detection
  const hasCssInJs = /styled-components|emotion|stitches|vanilla-extract/i.test(html);
  if (hasCssInJs) {
    checks.push({
      id: "dom-css-in-js",
      category: "rendering",
      name: "CSS-in-JS detecte",
      status: "info",
      severity: "info",
      description: "Librairie CSS-in-JS detectee — peut impacter le temps de rendu initial",
      recommendation: "Si le LCP est lent, envisagez d'extraire le CSS statiquement (ex: vanilla-extract, Tailwind) pour eliminer le cout runtime.",
    });
  }

  return checks;
}

// =============================================================================
// 6. RESOURCE HINTS & OPTIMIZATION
// =============================================================================

function checkOptimization(html: string, thirdPartyDomains: string[]): PerfCheck[] {
  const checks: PerfCheck[] = [];

  // Preconnect
  const preconnects = (html.match(/<link[^>]*rel=["'](preconnect|dns-prefetch)["'][^>]*>/gi) || []);
  const hasPreconnect = preconnects.length > 0;
  checks.push({
    id: "opt-preconnect",
    category: "optimization",
    name: "Preconnect vers domaines tiers",
    status: hasPreconnect ? "pass" : thirdPartyDomains.length > 0 ? "warn" : "info",
    severity: !hasPreconnect && thirdPartyDomains.length > 3 ? "medium" : "info",
    description: hasPreconnect
      ? `${preconnects.length} preconnect(s) detecte(s)`
      : thirdPartyDomains.length > 0
        ? `${thirdPartyDomains.length} domaines tiers sans preconnect`
        : "Aucun domaine tiers detecte",
    value: `${preconnects.length} preconnect(s)`,
    recommendation: !hasPreconnect && thirdPartyDomains.length > 0
      ? "Ajoutez <link rel='preconnect'> pour les domaines tiers critiques (analytics, CDN, fonts)."
      : undefined,
  });

  // DNS Prefetch
  const dnsPrefetch = (html.match(/<link[^>]*rel=["']dns-prefetch["'][^>]*>/gi) || []);
  checks.push({
    id: "opt-dns-prefetch",
    category: "optimization",
    name: "DNS Prefetch",
    status: dnsPrefetch.length > 0 ? "pass" : "info",
    severity: "info",
    description: dnsPrefetch.length > 0
      ? `${dnsPrefetch.length} dns-prefetch detecte(s)`
      : "Aucun dns-prefetch detecte",
    value: `${dnsPrefetch.length}`,
    recommendation: dnsPrefetch.length === 0 && thirdPartyDomains.length > 0
      ? "Ajoutez <link rel='dns-prefetch'> pour les domaines tiers secondaires."
      : undefined,
  });

  // Preload
  const preloads = (html.match(/<link[^>]*rel=["']preload["'][^>]*>/gi) || []);
  checks.push({
    id: "opt-preload",
    category: "optimization",
    name: "Preload de ressources critiques",
    status: preloads.length > 0 ? "pass" : "warn",
    severity: preloads.length > 0 ? "info" : "medium",
    description: preloads.length > 0
      ? `${preloads.length} ressource(s) preloadee(s)`
      : "Aucune ressource preloadee",
    value: `${preloads.length}`,
    recommendation: preloads.length === 0
      ? "Preloadez les ressources critiques (fonts, hero image, CSS critique) avec <link rel='preload'>."
      : undefined,
  });

  // Prefetch
  const prefetches = (html.match(/<link[^>]*rel=["']prefetch["'][^>]*>/gi) || []);
  checks.push({
    id: "opt-prefetch",
    category: "optimization",
    name: "Prefetch de pages/ressources",
    status: prefetches.length > 0 ? "pass" : "info",
    severity: "info",
    description: prefetches.length > 0
      ? `${prefetches.length} ressource(s) prefetchee(s)`
      : "Aucun prefetch detecte",
    value: `${prefetches.length}`,
    recommendation: prefetches.length === 0
      ? "Utilisez <link rel='prefetch'> pour precharger les pages probables de navigation (ex: page suivante)."
      : undefined,
  });

  // Third-party scripts analysis
  const tpStatus = thirdPartyDomains.length <= 5 ? "pass" : thirdPartyDomains.length <= 10 ? "warn" : "fail";
  checks.push({
    id: "opt-third-party",
    category: "optimization",
    name: "Scripts tiers",
    status: tpStatus,
    severity: tpStatus === "fail" ? "high" : tpStatus === "warn" ? "medium" : "info",
    description: `${thirdPartyDomains.length} domaine(s) tiers charge(s)`,
    value: thirdPartyDomains.slice(0, 10).join(", ") || "Aucun",
    recommendation: thirdPartyDomains.length > 5
      ? "Reduisez les scripts tiers : chaque domaine tiers ajoute du DNS lookup + connexion. Chargez-les en defer ou apres l'interaction."
      : undefined,
  });

  // Module/nomodule pattern
  const hasModuleScripts = /type=["']module["']/i.test(html);
  checks.push({
    id: "opt-module",
    category: "optimization",
    name: "ES Modules (type=module)",
    status: hasModuleScripts ? "pass" : "info",
    severity: "info",
    description: hasModuleScripts
      ? "Scripts ES Modules detectes — code splitting natif"
      : "Pas de scripts type=module detectes",
    recommendation: !hasModuleScripts
      ? "Utilisez type='module' pour le tree-shaking natif et un meilleur code splitting."
      : undefined,
  });

  // Service Worker
  const hasServiceWorker = /navigator\.serviceWorker|workbox|sw\.js/i.test(html);
  checks.push({
    id: "opt-sw",
    category: "optimization",
    name: "Service Worker / PWA",
    status: hasServiceWorker ? "pass" : "info",
    severity: "info",
    description: hasServiceWorker
      ? "Service Worker detecte — cache offline possible"
      : "Aucun Service Worker detecte",
    recommendation: !hasServiceWorker
      ? "Envisagez un Service Worker pour le cache offline et des chargements subsequents quasi-instantanes."
      : undefined,
  });

  return checks;
}

// =============================================================================
// 7. CORE WEB VITALS ESTIMATION
// =============================================================================

function checkCoreWebVitals(
  html: string,
  responseTime: number,
  resources: ResourceStats,
  pageSize: number
): PerfCheck[] {
  const checks: PerfCheck[] = [];

  // Estimated FCP (based on TTFB + blocking resources + page size)
  const blockingPenalty = resources.syncScripts * 200 + resources.totalStylesheets * 100;
  const sizePenalty = Math.max(0, (pageSize / 1024 - 100) * 5);
  const estimatedFCP = responseTime + blockingPenalty + sizePenalty;
  const fcpStatus = estimatedFCP < 1800 ? "pass" : estimatedFCP < 3000 ? "warn" : "fail";
  checks.push({
    id: "cwv-fcp",
    category: "cwv",
    name: "First Contentful Paint (estime)",
    status: fcpStatus,
    severity: fcpStatus === "fail" ? "critical" : fcpStatus === "warn" ? "high" : "info",
    description: `FCP estime : ~${Math.round(estimatedFCP)}ms${fcpStatus === "pass" ? " — Bon" : fcpStatus === "warn" ? " — A ameliorer" : " — Mauvais"}`,
    value: `~${Math.round(estimatedFCP)}ms`,
    recommendation: fcpStatus !== "pass"
      ? "Pour ameliorer le FCP : reduisez les scripts bloquants, optimisez le TTFB, injectez le critical CSS inline."
      : undefined,
  });

  // LCP estimation (FCP + image loading penalty)
  const imgPenalty = resources.totalImages > 0 && resources.lazyImages < resources.totalImages ? 500 : 0;
  const estimatedLCP = estimatedFCP + imgPenalty + (resources.totalFonts > 0 ? 200 : 0);
  const lcpStatus = estimatedLCP < 2500 ? "pass" : estimatedLCP < 4000 ? "warn" : "fail";
  checks.push({
    id: "cwv-lcp",
    category: "cwv",
    name: "Largest Contentful Paint (estime)",
    status: lcpStatus,
    severity: lcpStatus === "fail" ? "critical" : lcpStatus === "warn" ? "high" : "info",
    description: `LCP estime : ~${Math.round(estimatedLCP)}ms${lcpStatus === "pass" ? " — Bon (<2.5s)" : lcpStatus === "warn" ? " — A ameliorer (2.5-4s)" : " — Mauvais (>4s)"}`,
    value: `~${Math.round(estimatedLCP)}ms`,
    recommendation: lcpStatus !== "pass"
      ? "Pour ameliorer le LCP : preloadez l'image hero, optimisez les fonts, utilisez srcset, reduisez les ressources bloquantes."
      : undefined,
  });

  // CLS estimation (based on images without dimensions + font loading)
  // Next.js Image (data-nimg) handles dimensions via CSS — no CLS contribution
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const imgsWithoutDims = imgTags.filter((img) =>
    (!/width=/i.test(img) || !/height=/i.test(img)) && !/data-nimg/i.test(img)
  );
  const fontFaces = html.match(/@font-face/gi) || [];
  const hasFontDisplaySwap = /font-display:\s*(swap|optional|fallback)/i.test(html);
  const clsRisk = imgsWithoutDims.length * 0.05 + (fontFaces.length > 0 && !hasFontDisplaySwap ? 0.1 : 0);
  const clsStatus = clsRisk < 0.1 ? "pass" : clsRisk < 0.25 ? "warn" : "fail";
  checks.push({
    id: "cwv-cls",
    category: "cwv",
    name: "Cumulative Layout Shift (risque estime)",
    status: clsStatus,
    severity: clsStatus === "fail" ? "high" : clsStatus === "warn" ? "medium" : "info",
    description: `Risque CLS estime : ${clsRisk.toFixed(2)}${clsStatus === "pass" ? " — Bon (<0.1)" : clsStatus === "warn" ? " — A ameliorer (0.1-0.25)" : " — Mauvais (>0.25)"}`,
    value: clsRisk.toFixed(2),
    recommendation: clsStatus !== "pass"
      ? `Pour reduire le CLS : ${imgsWithoutDims.length > 0 ? `ajoutez width/height a ${imgsWithoutDims.length} image(s)` : ""}${!hasFontDisplaySwap && fontFaces.length > 0 ? ", utilisez font-display: swap" : ""}.`
      : undefined,
  });

  // TBT estimation (based on sync scripts + inline JS)
  // Framework data scripts (RSC payloads, hydration data) are tiny and non-blocking
  const syncScriptPenalty = resources.syncScripts * 300;
  const inlineJsPenalty = resources.inlineScripts * 50;
  const estimatedTBT = syncScriptPenalty + inlineJsPenalty;
  const tbtStatus = estimatedTBT < 300 ? "pass" : estimatedTBT < 800 ? "warn" : "fail";
  checks.push({
    id: "cwv-tbt",
    category: "cwv",
    name: "Total Blocking Time (estime)",
    status: tbtStatus,
    severity: tbtStatus === "fail" ? "high" : tbtStatus === "warn" ? "medium" : "info",
    description: `TBT estime : ~${estimatedTBT}ms${tbtStatus === "pass" ? " — Bon (<200ms)" : tbtStatus === "warn" ? " — A ameliorer (200-600ms)" : " — Mauvais (>600ms)"}`,
    value: `~${estimatedTBT}ms`,
    recommendation: tbtStatus !== "pass"
      ? "Pour reduire le TBT : ajoutez defer/async aux scripts, divisez les taches longues, utilisez requestIdleCallback."
      : undefined,
  });

  return checks;
}

// =============================================================================
// SCORE CALCULATION
// =============================================================================

function calculateScore(checks: PerfCheck[]): { score: number; grade: string } {
  let score = 100;

  for (const check of checks) {
    if (check.status === "fail") {
      switch (check.severity) {
        case "critical": score -= 15; break;
        case "high": score -= 10; break;
        case "medium": score -= 5; break;
        case "low": score -= 2; break;
      }
    } else if (check.status === "warn") {
      switch (check.severity) {
        case "critical": score -= 8; break;
        case "high": score -= 5; break;
        case "medium": score -= 3; break;
        case "low": score -= 1; break;
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

    url = url.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "URL invalide" }, { status: 400 });
    }

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

    const startTime = Date.now();
    const response = await safeFetch(targetUrl.toString(), {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PerfAuditBot/1.0; +https://thewebmaster.be)",
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
    const htmlSizeKB = Math.round(pageSize / 1024);

    const resources = extractResourceStats(html);
    const thirdPartyDomains = extractThirdPartyDomains(html, hostname);
    const technologies = detectTechnologies(html, headers);

    // Run all checks
    const serverChecks = checkServerNetwork(html, headers, responseTime, pageSize, isHttps);
    const resourceChecks = checkResources(html, resources);
    const imageChecks = checkImages(html, resources);
    const fontChecks = checkFonts(html);
    const renderingChecks = checkRendering(html);
    const optimizationChecks = checkOptimization(html, thirdPartyDomains);
    const cwvChecks = checkCoreWebVitals(html, responseTime, resources, pageSize);

    const allChecks = [
      ...cwvChecks,
      ...serverChecks,
      ...resourceChecks,
      ...imageChecks,
      ...fontChecks,
      ...renderingChecks,
      ...optimizationChecks,
    ];

    const { score, grade } = calculateScore(allChecks);

    // Estimated load times
    const totalWeight = pageSize;
    const estimatedLoadTime = {
      fast3g: `${((totalWeight / (1.6 * 1024 * 1024)) * 1000 + responseTime).toFixed(0)}ms`,
      slow3g: `${((totalWeight / (0.4 * 1024 * 1024)) * 1000 + responseTime * 2).toFixed(0)}ms`,
      cable: `${((totalWeight / (5 * 1024 * 1024)) * 1000 + responseTime).toFixed(0)}ms`,
    };

    const result: PerfAuditResult = {
      url: targetUrl.toString(),
      timestamp: new Date().toISOString(),
      score,
      grade,
      checks: allChecks,
      responseTime,
      pageSize,
      htmlSize: htmlSizeKB,
      resources,
      technologies,
      serverInfo: {
        server: headers.get("server"),
        poweredBy: headers.get("x-powered-by"),
        protocol: isHttps ? "HTTPS" : "HTTP",
        compression: headers.get("content-encoding"),
      },
      thirdPartyDomains,
      estimatedLoadTime,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Performance Audit error:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de l'analyse" },
      { status: 500 }
    );
  }
}
