import { NextRequest, NextResponse } from "next/server";
import { insertAuditRequest, insertAuditReport, getPreviousAudit } from "@/lib/db";
import type {
  AuditCheck,
  CategoryScore,
  AuditResult,
  AuditStatus,
  Regression,
} from "@/types/audit";

import { safeFetch } from "@/lib/audit/fetch";
import { parseImgTags, parseLinkTags, getLinksByRel, stripScriptsAndStyles } from "@/lib/audit/html-parse";
import { checkResourceBudget } from "@/lib/audit/resource-budget";
import { analyzeCriticalPath } from "@/lib/audit/critical-path";
import { checkThirdPartyImpact } from "@/lib/audit/third-party-impact";
import { checkFontOptimization } from "@/lib/audit/font-optimization";
import { buildPerfThreatModel } from "@/lib/audit/perf-threats";
import { checkPageSpeed } from "@/lib/audit/pagespeed";
import { detectStack } from "@/lib/audit/stack";
import { enrichWithCompliance } from "@/lib/audit/compliance";
import { enhanceWithStackRemediations } from "@/lib/audit/remediations";
import { buildActionPlan } from "@/lib/audit/action-plan";
import { discoverRoutes } from "@/lib/audit/crawl";

// =============================================================================
// PERFORMANCE AUDIT API — Core Web Vitals réels (via PSI) + analyses locales
// avancées : resource budgets, critical path, third-party impact, fonts.
// =============================================================================

function isValidHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.startsWith("172.16.") ||
      host.endsWith(".internal") ||
      host.endsWith(".local")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function detectTechnologies(html: string, headers: Headers): string[] {
  const techs: string[] = [];
  const patterns: [string, RegExp][] = [
    ["Next.js", /__next|\/_next\/static/],
    ["Nuxt.js", /__nuxt/],
    ["Astro", /astro-island/],
    ["React", /react/i],
    ["Vue.js", /vue\.js|v-for\b|v-if\b/],
    ["WordPress", /\/wp-content\/(?:themes|plugins|uploads)/],
    ["Shopify", /cdn\.shopify\.com|Shopify\.theme/],
    ["jQuery", /\/jquery(?:[.-]\d|\.min)?\.js/],
    ["Tailwind CSS", /tailwindcss|tw-[a-z]/],
    ["Cloudflare", /cf-ray|cloudflare/i],
    ["Vercel", /x-vercel-id|vercel/i],
    ["Netlify", /x-nf-request-id|netlify/i],
  ];
  for (const [name, re] of patterns) {
    if (re.test(html)) techs.push(name);
  }
  const server = (headers.get("server") || "").toLowerCase();
  if (server.includes("nginx")) techs.push("Nginx");
  if (server.includes("apache")) techs.push("Apache");
  if (server.includes("litespeed")) techs.push("LiteSpeed");
  if (server.includes("caddy")) techs.push("Caddy");
  return [...new Set(techs)];
}

// =============================================================================
// SERVER METRICS — TTFB, compression, HTTP protocol, cache headers
// =============================================================================

async function checkServerMetrics(
  headers: Headers,
  responseTime: number,
  url: string
): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];

  // TTFB — now just an indicator. Real CWV come from PSI.
  // We measure a single request → prone to noise. We report as "info" if no
  // PSI data is available; otherwise we defer to PSI's server-response-time.
  const ttfbStatus = responseTime < 600 ? "pass" : responseTime < 1200 ? "info" : "warn";
  checks.push({
    id: "perf-ttfb-sample",
    category: "server",
    name: "TTFB (mesure locale)",
    status: ttfbStatus,
    severity: ttfbStatus === "warn" ? "medium" : undefined,
    description: `Temps de réponse sur une requête unique : ${responseTime} ms. Les Core Web Vitals PSI/CrUX ci-dessous reflètent la distribution réelle.`,
    value: `${responseTime} ms`,
  });

  // Compression
  const encoding = headers.get("content-encoding") || "";
  const hasCompression = /gzip|br|deflate|zstd/i.test(encoding);
  checks.push({
    id: "perf-compression",
    category: "server",
    name: "Compression (Brotli/Gzip)",
    status: hasCompression ? "pass" : "warn",
    severity: hasCompression ? undefined : "medium",
    description: hasCompression
      ? `Compression active : ${encoding}. ${/br/i.test(encoding) ? "Brotli (optimal)" : /zstd/i.test(encoding) ? "Zstd (optimal)" : "Gzip (correct, Brotli recommandé)"}.`
      : "Aucune compression détectée — le transfert réseau est 3-5× plus lourd que nécessaire.",
    value: encoding || "Aucune",
    recommendation: !hasCompression
      ? "Activez Brotli (préféré) ou gzip dans votre serveur / CDN."
      : encoding === "gzip"
        ? "Brotli compresse 15-25 % mieux que gzip — activez-le si votre stack le supporte."
        : undefined,
  });

  // HTTP/2 or HTTP/3 detection via Alt-Svc header (authoritative) + fallback to server header
  const altSvc = headers.get("alt-svc") || "";
  const hasHttp3 = /\bh3\b|\bh3-\d{2}\b|\bquic\b/i.test(altSvc);
  if (hasHttp3) {
    checks.push({
      id: "perf-http3",
      category: "server",
      name: "Support HTTP/3 (QUIC)",
      status: "pass",
      description: "Le serveur annonce HTTP/3 via Alt-Svc — connexions plus rapides sur mobile (QUIC).",
      value: altSvc,
    });
  } else if (url.startsWith("https://")) {
    checks.push({
      id: "perf-http3",
      category: "server",
      name: "Support HTTP/3 (QUIC)",
      status: "info",
      description: "HTTP/3 non annoncé. Gain typique : 10-30 % de latence mobile sur réseaux lossy.",
      recommendation: "Cloudflare : activez HTTP/3 dans le dashboard. Caddy : HTTP/3 par défaut.",
    });
  }

  // Cache headers for HTML
  const cacheControl = headers.get("cache-control");
  if (cacheControl) {
    const hasMaxAge = /max-age=\d+/i.test(cacheControl);
    const hasPublic = /\bpublic\b/i.test(cacheControl);
    const isNoStore = /\bno-store\b/i.test(cacheControl);
    checks.push({
      id: "perf-cache-headers",
      category: "server",
      name: "Cache-Control (HTML)",
      status: hasMaxAge || isNoStore ? "pass" : "info",
      description:
        isNoStore
          ? `HTML non-cacheable : ${cacheControl}. Correct pour les pages dynamiques personnalisées.`
          : hasMaxAge
            ? `HTML cacheable : ${cacheControl}${hasPublic ? " (public)" : ""}.`
            : `Cache-Control présent mais sans directive claire : ${cacheControl}`,
      value: cacheControl,
    });
  } else {
    checks.push({
      id: "perf-cache-headers",
      category: "server",
      name: "Cache-Control (HTML)",
      status: "info",
      description: "Aucun Cache-Control en réponse. Chaque visite re-télécharge le HTML.",
      recommendation: "Pour les pages statiques : `Cache-Control: public, max-age=60, s-maxage=3600, stale-while-revalidate=86400`.",
    });
  }

  // CDN detection — quick signal for end users
  const cdnSignals: [RegExp | string, string][] = [
    [headers.get("cf-ray") || "", "Cloudflare"],
    [headers.get("x-vercel-id") || "", "Vercel Edge Network"],
    [headers.get("x-nf-request-id") || "", "Netlify CDN"],
    [headers.get("x-amz-cf-id") || "", "Amazon CloudFront"],
    [headers.get("fastly-debug-digest") || "", "Fastly"],
    [/cloudflare/i, (headers.get("server") || "") ? "Cloudflare" : ""],
  ];
  const detectedCdn = cdnSignals.find(([sig, name]) => {
    if (!name) return false;
    if (sig instanceof RegExp) return sig.test(headers.get("server") || "");
    return !!sig;
  })?.[1];

  if (detectedCdn) {
    checks.push({
      id: "perf-cdn",
      category: "server",
      name: "CDN détecté",
      status: "pass",
      description: `Diffusion via ${detectedCdn} — latence optimisée géographiquement.`,
      value: detectedCdn,
    });
  } else {
    checks.push({
      id: "perf-cdn",
      category: "server",
      name: "Aucun CDN détecté",
      status: "warn",
      severity: "low",
      description: "Aucun CDN détecté dans les en-têtes. Les visiteurs distants du serveur origine subissent une latence élevée.",
      recommendation: "Cloudflare (gratuit) ou Vercel/Netlify (pour apps statiques) offrent une mise en cache globale immédiate.",
    });
  }

  return checks;
}

// =============================================================================
// IMAGE OPTIMIZATION — modern formats, lazy, dimensions, priority
// =============================================================================

function checkImageOptimization(html: string): AuditCheck[] {
  const checks: AuditCheck[] = [];
  const imgs = parseImgTags(html);
  if (imgs.length === 0) return checks;

  // Modern formats — count WebP/AVIF + next/image (which negotiates modern formats)
  const modern = imgs.filter((i) => /\.(webp|avif)(?:\?|$)/i.test(i.src) || i.fromNextImage);
  const modernRatio = modern.length / imgs.length;

  if (modernRatio < 0.3 && !imgs.every((i) => i.fromNextImage)) {
    checks.push({
      id: "perf-modern-image-formats",
      category: "images",
      name: "Formats d'image modernes",
      status: "warn",
      severity: "medium",
      description: `${modern.length}/${imgs.length} images en format moderne (WebP/AVIF ou next/image). Les formats legacy (JPG/PNG) pèsent 30-50 % de plus.`,
      value: `${Math.round(modernRatio * 100)} %`,
      recommendation: "Servez en WebP/AVIF via next/image, Cloudflare Images, ou imgproxy.",
    });
  } else {
    checks.push({
      id: "perf-modern-image-formats",
      category: "images",
      name: "Formats d'image modernes",
      status: "pass",
      description: `${Math.round(modernRatio * 100)} % des images utilisent un format moderne (WebP/AVIF ou next/image).`,
    });
  }

  // Lazy loading — heuristic: skip the first 2 images (likely above-the-fold)
  // to avoid flagging the hero LCP as "should be lazy".
  const belowFoldCandidates = imgs.slice(2); // skip first 2 candidates
  if (belowFoldCandidates.length > 3) {
    const lazyBelowFold = belowFoldCandidates.filter(
      (i) => i.loading === "lazy" || i.fromNextImage
    );
    const lazyRatio = lazyBelowFold.length / belowFoldCandidates.length;
    if (lazyRatio < 0.4) {
      checks.push({
        id: "perf-lazy-below-fold",
        category: "images",
        name: "Lazy loading des images below-the-fold",
        status: "warn",
        severity: "medium",
        description: `Seulement ${lazyBelowFold.length}/${belowFoldCandidates.length} images below-the-fold sont lazy. Charge réseau inutile avant interaction.`,
        recommendation: "Ajoutez `loading=\"lazy\"` aux images sous le fold. Next.js : `next/image` lazy par défaut.",
      });
    }
  }

  // Hero image should NOT be lazy (the hero is often the LCP element)
  const firstImg = imgs[0];
  if (firstImg && firstImg.loading === "lazy" && !firstImg.fromNextImage) {
    checks.push({
      id: "perf-hero-lazy-wrong",
      category: "images",
      name: "Image LCP chargée en lazy",
      status: "fail",
      severity: "high",
      description: "La première image (souvent l'élément LCP) est en loading=\"lazy\" — elle sera chargée tard, dégradant le LCP de plusieurs secondes.",
      value: firstImg.src,
      recommendation: `Retirez loading="lazy" sur l'image hero. Ajoutez fetchpriority="high" pour prioriser son téléchargement.`,
    });
  }

  // Missing dimensions — CLS risk (skip next/image fill mode which uses CSS)
  const meaningful = imgs.filter((i) => !i.decorative && !i.fromNextImage);
  const withoutDims = meaningful.filter((i) => !i.width || !i.height);
  if (meaningful.length > 3 && withoutDims.length / meaningful.length > 0.4) {
    checks.push({
      id: "perf-image-dimensions",
      category: "images",
      name: "Images sans dimensions (risque CLS)",
      status: "warn",
      severity: "medium",
      description: `${withoutDims.length}/${meaningful.length} images sans width+height explicites. Contribue directement au Cumulative Layout Shift.`,
      recommendation: "Ajoutez width et height (ou utilisez next/image avec width/height ou fill).",
    });
  }

  return checks;
}

// =============================================================================
// HTML SIZE + DOM METRICS
// =============================================================================

function checkHtmlMetrics(html: string): AuditCheck[] {
  const checks: AuditCheck[] = [];

  // HTML size — calibrated for modern SSR (Next.js streams RSC payload)
  const htmlSize = new Blob([html]).size;
  const htmlSizeKB = Math.round(htmlSize / 1024);
  let htmlStatus: AuditCheck["status"] = "pass";
  let htmlSev: AuditCheck["severity"];
  if (htmlSizeKB > 1500) {
    htmlStatus = "warn";
    htmlSev = "medium";
  } else if (htmlSizeKB > 800) {
    htmlStatus = "info";
  }
  checks.push({
    id: "perf-html-size",
    category: "server",
    name: "Taille du HTML",
    status: htmlStatus,
    severity: htmlSev,
    description: `${htmlSizeKB} Ko de HTML servi${htmlSizeKB > 500 ? " (sites SSR modernes atteignent 500-1500 Ko avec la RSC payload — acceptable)" : ""}.`,
    value: `${htmlSizeKB} Ko`,
    recommendation:
      htmlSizeKB > 1500
        ? "HTML très volumineux : streamez le contenu, paginez les listes, retirez le JSON inline inutilisé."
        : undefined,
  });

  // DOM size — stripping scripts first to count actual rendered nodes
  const domStripped = stripScriptsAndStyles(html);
  const nodeCount = (domStripped.match(/<[a-z][\w-]*\b[^>]*>/gi) || []).length;
  if (nodeCount > 3000) {
    checks.push({
      id: "perf-dom-size",
      category: "rendering",
      name: "DOM volumineux",
      status: "fail",
      severity: "high",
      description: `${nodeCount.toLocaleString()} nœuds dans le DOM. Au-delà de 1 500, Google recommande de virtualiser / paginer. Au-delà de 3 000, l'INP est systématiquement mauvais.`,
      value: `${nodeCount} nœuds`,
      recommendation: "Virtualisez les longues listes (react-virtual, @tanstack/virtual), lazy-renderez les sections below-the-fold.",
    });
  } else if (nodeCount > 1500) {
    checks.push({
      id: "perf-dom-size",
      category: "rendering",
      name: "DOM légèrement volumineux",
      status: "warn",
      severity: "low",
      description: `${nodeCount.toLocaleString()} nœuds DOM. La recommandation Google est < 1 500.`,
      value: `${nodeCount} nœuds`,
    });
  }

  // Inline CSS — important if critical CSS has been inlined (good), but excessive inline CSS hurts cacheability
  const inlineStylesBlocks = html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/gi) || [];
  const inlineCssSize = inlineStylesBlocks.reduce((acc, b) => acc + b.length, 0);
  const inlineCssKB = Math.round(inlineCssSize / 1024);
  if (inlineCssKB > 80) {
    checks.push({
      id: "perf-inline-css-bloated",
      category: "resources",
      name: "CSS inline excessif",
      status: "warn",
      severity: "medium",
      description: `${inlineCssKB} Ko de CSS inline — au-delà de 80 Ko, le gain critical-path est annulé par le coût non-cacheable.`,
      value: `${inlineCssKB} Ko`,
      recommendation: "Inlinez uniquement le critical CSS above-the-fold (~14 Ko max), externalisez le reste.",
    });
  }

  return checks;
}

// =============================================================================
// SCORING
// =============================================================================

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

const categoryLabels: Record<string, string> = {
  server: "Serveur & Cache",
  resources: "Ressources & Budgets",
  rendering: "Rendering Path",
  images: "Images",
  fonts: "Fontes",
  performance: "Core Web Vitals",
  cwv: "Core Web Vitals",
};

function calculateScore(checks: AuditCheck[]): {
  score: number;
  grade: string;
  status: AuditStatus;
  categoryScores: CategoryScore[];
} {
  const { score, grade } = scoreFromChecks(checks);
  const categories = [...new Set(checks.map((c) => c.category))];
  const categoryScores: CategoryScore[] = categories.map((cat) => {
    const catChecks = checks.filter((c) => c.category === cat);
    const scorable = catChecks.filter((c) => c.status !== "info");
    const { score: catScore, grade: catGrade } = scoreFromChecks(catChecks);
    return {
      category: cat,
      label: categoryLabels[cat] || cat,
      score: catScore,
      grade: catGrade,
      total: scorable.length,
      passed: scorable.filter((c) => c.status === "pass").length,
      warned: scorable.filter((c) => c.status === "warn").length,
      failed: scorable.filter((c) => c.status === "fail").length,
    };
  });

  const hasCritical = checks.some((c) => c.severity === "critical" && c.status === "fail");
  const hasHigh = checks.some((c) => c.severity === "high" && c.status === "fail");
  let status: AuditStatus = "production-ready";
  if (hasCritical) status = "critical";
  else if (hasHigh) status = "at-risk";
  else if (score < 75) status = "needs-fixes";

  return { score, grade, status, categoryScores };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export const maxDuration = 60;

function extractThirdPartyDomains(html: string, baseUrl: string): string[] {
  const domains = new Set<string>();
  let pageHost = "";
  try {
    pageHost = new URL(baseUrl).hostname;
  } catch {}
  const urlRegex = /(?:src|href)\s*=\s*["']((?:https?:)?\/\/[^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(html)) !== null) {
    try {
      const u = new URL(match[1], baseUrl);
      if (u.hostname !== pageHost && !u.hostname.endsWith("." + pageHost)) {
        domains.add(u.hostname);
      }
    } catch {}
    if (domains.size >= 30) break;
  }
  return [...domains];
}

function estimateLoadTimes(sizeBytes: number): { fast3g: string; slow3g: string; cable: string } {
  // Rough speeds based on Chrome DevTools network throttling profiles
  const fast3g = sizeBytes / (1.5 * 1024 * 1024 / 8); // 1.5 Mbps download
  const slow3g = sizeBytes / (0.4 * 1024 * 1024 / 8); // 400 Kbps
  const cable = sizeBytes / (5 * 1024 * 1024 / 8); // 5 Mbps
  const fmt = (s: number) => (s < 1 ? `${Math.round(s * 1000)} ms` : `${s.toFixed(1)} s`);
  return { fast3g: fmt(fast3g), slow3g: fmt(slow3g), cable: fmt(cable) };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { url } = body;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL requise" }, { status: 400 });
    }
    url = url.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (!isValidHttpUrl(url)) {
      return NextResponse.json({ error: "URL invalide ou interdite" }, { status: 400 });
    }

    const targetUrl = url;
    const parsedUrl = new URL(targetUrl);
    const isHttps = parsedUrl.protocol === "https:";

    // Fetch the page
    const startTime = Date.now();
    const response = await safeFetch(targetUrl, {
      timeout: 15000,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br, zstd",
      },
    });
    const responseTime = Date.now() - startTime;

    if (!response || !response.ok) {
      return NextResponse.json(
        { error: `Impossible de charger le site (HTTP ${response?.status || "timeout"})` },
        { status: 502 }
      );
    }

    const html = await response.text();
    const headers = response.headers;

    // Tech / stack detection
    const technologies = detectTechnologies(html, headers);
    const stackInfo = detectStack(html, headers, technologies);

    // Multi-page crawl — best-effort, used for reporting context
    let crawledRoutes: string[] = [];
    try {
      crawledRoutes = await discoverRoutes(targetUrl, 5);
    } catch {}

    // Run all perf checks in parallel
    const [
      serverChecks,
      budgetResult,
      thirdPartyChecks,
      pagespeedChecks,
    ] = await Promise.all([
      checkServerMetrics(headers, responseTime, targetUrl),
      checkResourceBudget(html, targetUrl),
      Promise.resolve(checkThirdPartyImpact(html, targetUrl)),
      checkPageSpeed(targetUrl),
    ]);

    const criticalPath = analyzeCriticalPath(html);
    const imageChecks = checkImageOptimization(html);
    const fontChecks = checkFontOptimization(html);
    const htmlMetricsChecks = checkHtmlMetrics(html);

    const baseChecks: AuditCheck[] = [
      ...serverChecks,
      ...pagespeedChecks,        // Real Core Web Vitals (LCP/CLS/INP/FCP/TBT)
      ...criticalPath.checks,
      ...budgetResult.checks,
      ...thirdPartyChecks,
      ...imageChecks,
      ...fontChecks,
      ...htmlMetricsChecks,
    ];

    // Enrich with compliance + stack-aware remediations
    const enrichedChecks = enhanceWithStackRemediations(
      enrichWithCompliance(baseChecks),
      stackInfo
    );

    const { score, grade, status, categoryScores } = calculateScore(enrichedChecks);
    const actionPlan = buildActionPlan(enrichedChecks, 10);
    const threatModel = buildPerfThreatModel(
      stackInfo,
      enrichedChecks.map((c) => ({ id: c.id, status: c.status }))
    );

    // Regression detection
    let regressions: Regression[] = [];
    try {
      const previous = getPreviousAudit(targetUrl, "performance");
      if (previous && previous.report && typeof previous.report === "object") {
        const prevReport = previous.report as { checks?: AuditCheck[] };
        const prevChecks = Array.isArray(prevReport.checks) ? prevReport.checks : [];
        const prevMap = new Map(prevChecks.map((c) => [c.id, c]));
        const sevRank: Record<string, number> = { pass: 0, info: 0, warn: 1, fail: 2 };
        for (const curr of enrichedChecks) {
          const prev = prevMap.get(curr.id);
          if (!prev) continue;
          if ((sevRank[curr.status] ?? 0) > (sevRank[prev.status] ?? 0)) {
            regressions.push({
              checkId: curr.id,
              name: curr.name,
              previousStatus: prev.status,
              currentStatus: curr.status,
              previousAuditAt: previous.createdAt,
            });
          }
        }
        regressions = regressions.slice(0, 10);
      }
    } catch {}

    // Store the report
    const linkTags = parseLinkTags(html);
    const imgs = parseImgTags(html);
    const cmsLink = getLinksByRel(linkTags, "canonical")[0]?.href || null;

    let reportId: string | undefined;
    try {
      reportId = insertAuditReport({
        siteUrl: targetUrl,
        score,
        grade,
        auditType: "performance",
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
          cmsInfo: null,
          stack: stackInfo,
          actionPlan,
          threatModel,
          regressions,
          crawledRoutes,
          pageSize: new Blob([html]).size,
          images: {
            total: imgs.length,
            withAlt: imgs.filter((i) => i.alt && i.alt.trim().length >= 3).length,
            withoutAlt: imgs.filter((i) => !i.alt || i.alt.trim().length < 3).length,
          },
          seoMeta: {
            title: html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || null,
            description: null,
            canonical: cmsLink,
            ogImage: null,
            language: html.match(/<html[^>]*\blang\s*=\s*["']([^"']+)["']/i)?.[1] || null,
            robots: null,
          },
        },
      });
    } catch {}

    // Legacy-shape fields for backward compat with existing UI components.
    // These are derived trivially from the parsed data so the old UI sections
    // (QuickStats, ResourceBreakdown, ServerInfo, EstimatedLoadTimes) keep
    // rendering without changes.
    const htmlSizeKB = Math.round(new Blob([html]).size / 1024);
    const imgsAll = parseImgTags(html);
    const scriptsAll = html.match(/<script\b[^>]*>/gi) || [];
    const scriptsWithSrc = html.match(/<script\b[^>]*\bsrc\s*=\s*["'][^"']+["'][^>]*>/gi) || [];
    const asyncScripts = scriptsWithSrc.filter((s) => /\basync\b/i.test(s)).length;
    const deferScripts = scriptsWithSrc.filter((s) => /\bdefer\b/i.test(s)).length;
    const stylesheetsAll = html.match(/<link\b[^>]*\brel\s*=\s*["']stylesheet["']/gi) || [];
    const inlineStylesAll = html.match(/<style\b[^>]*>/gi) || [];
    const fontPreloads = html.match(/<link\b[^>]*\brel\s*=\s*["']preload["'][^>]*\bas\s*=\s*["']font["']/gi) || [];
    const thirdPartyDomains = extractThirdPartyDomains(html, targetUrl);
    const estimatedLoadTime = estimateLoadTimes(new Blob([html]).size);

    const result: AuditResult & {
      htmlSize: number;
      resources: {
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
      };
      serverInfo: {
        server: string | null;
        poweredBy: string | null;
        protocol: string | null;
        compression: string | null;
      };
      thirdPartyDomains: string[];
      estimatedLoadTime: { fast3g: string; slow3g: string; cable: string };
    } = {
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
      cmsInfo: null,
      stack: stackInfo,
      actionPlan,
      threatModel,
      regressions,
      crawledRoutes,
      pageSize: new Blob([html]).size,
      reportId,
      publicUrl: reportId ? `/performance-audit/r/${reportId}` : undefined,
      htmlSize: htmlSizeKB,
      resources: {
        totalScripts: scriptsWithSrc.length,
        syncScripts: scriptsWithSrc.length - asyncScripts - deferScripts,
        asyncScripts,
        deferScripts,
        inlineScripts: scriptsAll.length - scriptsWithSrc.length,
        totalStylesheets: stylesheetsAll.length,
        inlineStyles: inlineStylesAll.length,
        totalImages: imgsAll.length,
        lazyImages: imgsAll.filter((i) => i.loading === "lazy" || i.fromNextImage).length,
        totalFonts: fontPreloads.length,
        preloadedFonts: fontPreloads.length,
      },
      serverInfo: {
        server: headers.get("server"),
        poweredBy: headers.get("x-powered-by"),
        protocol: (headers.get("alt-svc") || "").includes("h3") ? "HTTP/3" : "HTTP/2",
        compression: headers.get("content-encoding"),
      },
      thirdPartyDomains,
      estimatedLoadTime,
    };

    // Track
    try {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      insertAuditRequest({
        siteUrl: result.url,
        auditType: "performance",
        score: result.score,
        grade: result.grade,
        ipAddress: ip,
      });
    } catch {}

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Performance Audit] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de l'analyse de performance" },
      { status: 500 }
    );
  }
}
