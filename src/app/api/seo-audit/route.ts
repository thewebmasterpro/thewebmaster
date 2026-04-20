import { NextRequest, NextResponse } from "next/server";
import { insertAuditRequest, insertAuditReport, getPreviousAudit } from "@/lib/db";
import type {
  AuditCheck,
  CategoryScore,
  AuditResult,
  AuditStatus,
  Regression,
  SeoMeta,
} from "@/types/audit";

import {
  stripScriptsAndStyles,
  parseMetaTags,
  getMetaContent,
  parseLinkTags,
  getLinksByRel,
  extractPageTitle,
  extractLangAttribute,
  extractHeadings,
  parseImgTags,
  parseAnchorTags,
  categorizeLinks,
  extractVisibleText,
  wordCount,
} from "@/lib/audit/html-parse";
import { validateJsonLd } from "@/lib/audit/json-ld";
import { validateHreflang } from "@/lib/audit/hreflang";
import { checkSitemap } from "@/lib/audit/sitemap";
import { checkOgImage } from "@/lib/audit/og-image";
import { detectSiteContext, severityPolicyFor } from "@/lib/audit/site-context";
import { buildSeoThreatModel } from "@/lib/audit/seo-threats";
import { detectStack } from "@/lib/audit/stack";
import { enrichWithCompliance } from "@/lib/audit/compliance";
import { enhanceWithStackRemediations } from "@/lib/audit/remediations";
import { buildActionPlan } from "@/lib/audit/action-plan";
import { discoverRoutes } from "@/lib/audit/crawl";
import { sameLogicalUrl, normaliseUrlForComparison } from "@/lib/audit/fetch";
import { checkBrokenLinks } from "@/lib/audit/link-check";
import { checkPageSpeed } from "@/lib/audit/pagespeed";

// =============================================================================
// SEO AUDIT API — analyse SEO approfondie, robuste aux FPs, enrichie
// Technique + On-Page + Performance + Off-Page + Action Plan + Threat Model
// =============================================================================

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
  const checks: [string, RegExp][] = [
    ["Next.js", /__next|\/_next\/static/],
    ["Nuxt.js", /__nuxt/],
    ["React", /react/i],
    ["Vue.js", /vue\.js|v-for\b|v-if\b/],
    ["Angular", /ng-version=/],
    ["Astro", /astro-island/],
    ["SvelteKit", /sveltekit/i],
    ["WordPress", /\/wp-content\/(?:themes|plugins|uploads)/],
    ["Shopify", /cdn\.shopify\.com|Shopify\.theme/],
    ["Wix", /static\.wixstatic\.com|_wixCssModules/],
    ["Squarespace", /static\d?\.squarespace\.com/],
    ["jQuery", /\/jquery(?:[.-]\d|\.min)?\.js/],
    ["Bootstrap", /bootstrap(?:\.min)?\.(?:js|css)/],
    ["Tailwind CSS", /tailwindcss|tw-[a-z]/],
    ["Google Analytics", /google-analytics\.com|\bgtag\s*\(/],
    ["Google Tag Manager", /googletagmanager\.com\/gtm/],
    ["Facebook Pixel", /connect\.facebook\.net|\bfbq\s*\(/],
    ["Hotjar", /static\.hotjar\.com/],
    ["Cloudflare", /cloudflare|cf-ray/i],
    ["Vercel", /vercel|x-vercel-id/i],
    ["Netlify", /netlify\.com|x-nf-request-id/i],
    ["Schema.org", /schema\.org/],
    ["Open Graph", /property=["']og:(?:title|description|image)["']/],
    ["Twitter Cards", /name=["']twitter:card["']/],
    ["AMP", /ampproject\.org/],
    ["Umami", /umami/i],
    ["Matomo", /matomo|piwik/i],
    ["Plausible", /plausible/i],
  ];
  for (const [name, pattern] of checks) {
    if (pattern.test(html)) techs.push(name);
  }
  const server = (headers.get("server") || "").toLowerCase();
  if (server.includes("nginx") && !techs.includes("Nginx")) techs.push("Nginx");
  if (server.includes("apache") && !techs.includes("Apache")) techs.push("Apache");
  if (server.includes("cloudflare") && !techs.includes("Cloudflare")) techs.push("Cloudflare");
  const poweredBy = (headers.get("x-powered-by") || "").toLowerCase();
  if (poweredBy.includes("express")) techs.push("Express.js");
  if (poweredBy.includes("php")) techs.push("PHP");
  if (poweredBy.includes("asp.net")) techs.push("ASP.NET");
  return [...new Set(techs)];
}

// =============================================================================
// 1. TECHNICAL CHECKS
// =============================================================================

async function checkTechnical(
  targetUrl: string,
  html: string,
  headers: Headers,
  responseTime: number
): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  const url = new URL(targetUrl);
  const isHttps = url.protocol === "https:";

  checks.push({
    id: "tech-https",
    category: "technical",
    name: "HTTPS",
    status: isHttps ? "pass" : "fail",
    severity: isHttps ? undefined : "critical",
    description: isHttps ? "Le site utilise HTTPS." : "Le site n'est pas servi en HTTPS — facteur de ranking Google négatif.",
    recommendation: !isHttps ? "Migrez vers HTTPS (Let's Encrypt gratuit). Indispensable au SEO moderne." : undefined,
  });

  // TTFB — calibré sur les recommandations Google (< 600 ms bon, < 800 ms warn, < 1800 ms acceptable)
  const ttfbStatus = responseTime < 600 ? "pass" : responseTime < 1200 ? "warn" : "fail";
  checks.push({
    id: "tech-ttfb",
    category: "technical",
    name: "Temps de réponse serveur (TTFB)",
    status: ttfbStatus,
    severity: ttfbStatus === "fail" ? "high" : ttfbStatus === "warn" ? "medium" : undefined,
    description: `TTFB mesuré : ${responseTime} ms. Google recommande < 600 ms.`,
    value: `${responseTime} ms`,
    recommendation:
      ttfbStatus !== "pass"
        ? "Ajoutez un CDN (Cloudflare, Vercel), du cache côté serveur, et optimisez vos requêtes DB."
        : undefined,
  });

  // Page size — perf signal only (pas de fail)
  const pageSizeKB = Math.round(new Blob([html]).size / 1024);
  const sizeStatus = pageSizeKB < 150 ? "pass" : pageSizeKB < 500 ? "info" : "warn";
  checks.push({
    id: "tech-pagesize",
    category: "technical",
    name: "Taille du HTML",
    status: sizeStatus,
    severity: sizeStatus === "warn" ? "low" : undefined,
    description: `${pageSizeKB} Ko de HTML servis.`,
    value: `${pageSizeKB} Ko`,
  });

  // Compression
  const encoding = headers.get("content-encoding") || "";
  const hasCompression = /gzip|br|deflate|zstd/i.test(encoding);
  checks.push({
    id: "tech-compression",
    category: "technical",
    name: "Compression (Brotli/Gzip)",
    status: hasCompression ? "pass" : "warn",
    severity: hasCompression ? undefined : "low",
    description: hasCompression
      ? `Compression active : ${encoding}.`
      : "Aucune compression — transfert ralenti, impact mineur sur TTFB.",
    value: encoding || "Aucune",
    recommendation: !hasCompression
      ? "Activez Brotli (préféré) ou gzip dans votre serveur / CDN."
      : undefined,
  });

  // Canonical — parsing via link tags (robuste)
  const linkTags = parseLinkTags(html);
  const canonicalLinks = getLinksByRel(linkTags, "canonical");
  if (canonicalLinks.length === 0) {
    checks.push({
      id: "tech-canonical",
      category: "technical",
      name: "Balise canonical",
      status: "warn",
      severity: "medium",
      description: "Aucune balise canonical. Risque de contenu dupliqué si des variantes d'URL existent (trailing slash, paramètres…).",
      recommendation: `Ajoutez <link rel="canonical" href="${targetUrl}"> dans <head>.`,
    });
  } else if (canonicalLinks.length > 1) {
    checks.push({
      id: "tech-canonical-multiple",
      category: "technical",
      name: "Plusieurs balises canonical",
      status: "fail",
      severity: "high",
      description: `${canonicalLinks.length} balises canonical détectées. Google ignore la deuxième — peut canonicaliser vers la mauvaise URL.`,
      value: canonicalLinks.map((l) => l.href).join(" | "),
      recommendation: "Gardez une seule <link rel=\"canonical\"> par page.",
    });
  } else {
    const canonical = canonicalLinks[0].href;
    let canonicalAbs = canonical;
    try {
      canonicalAbs = new URL(canonical, targetUrl).toString();
    } catch {}
    const matchesSelf = sameLogicalUrl(canonicalAbs, targetUrl);
    // Detect www vs non-www mismatch even when domains match
    const canonicalNorm = normaliseUrlForComparison(canonicalAbs);
    const targetNorm = normaliseUrlForComparison(targetUrl);
    const differentDomain = canonicalNorm && targetNorm && !matchesSelf &&
      canonicalNorm.split("/")[2]?.split(":")[0] !== targetNorm.split("/")[2]?.split(":")[0];

    if (differentDomain) {
      checks.push({
        id: "tech-canonical-cross-domain",
        category: "technical",
        name: "Canonical cross-domain",
        status: "warn",
        severity: "medium",
        description: `Le canonical pointe vers un autre domaine (${canonicalAbs}). Si intentionnel (syndication), OK — sinon Google ne va pas indexer cette page.`,
        value: canonicalAbs,
        recommendation: "Vérifiez que le canonical est correct. Pour l'auto-référence, utilisez la même URL que la page.",
      });
    } else {
      checks.push({
        id: "tech-canonical",
        category: "technical",
        name: "Balise canonical",
        status: "pass",
        description: matchesSelf
          ? "Canonical auto-référentielle — bonne pratique (comparaison normalisée : www/port/params ignorés)."
          : `Canonical pointant vers : ${canonicalAbs}`,
        value: canonicalAbs,
      });
    }
  }

  // Viewport — présence + contenu (anti-a11y flags)
  const metas = parseMetaTags(html);
  const viewport = getMetaContent(metas, "viewport");
  if (!viewport) {
    checks.push({
      id: "tech-viewport",
      category: "technical",
      name: "Meta viewport",
      status: "fail",
      severity: "critical",
      description: "Meta viewport absente. Le site ne s'adapte pas au mobile — Google dégrade le ranking mobile-first.",
      recommendation: `Ajoutez <meta name="viewport" content="width=device-width, initial-scale=1"> dans <head>.`,
    });
  } else {
    const normalized = viewport.toLowerCase().replace(/\s+/g, "");
    const disablesZoom =
      /user-scalable=no|user-scalable=0/.test(normalized) ||
      /maximum-scale=1(?:\.0+)?[,;]?/.test(normalized);
    const hasDeviceWidth = /width=device-width/.test(normalized);

    if (disablesZoom) {
      checks.push({
        id: "tech-viewport-no-zoom",
        category: "technical",
        name: "Viewport : zoom désactivé (anti-accessibilité)",
        status: "fail",
        severity: "high",
        description: `Viewport : "${viewport}". Empêcher le zoom utilisateur est une violation WCAG 2.1 (1.4.4 Resize Text) et pénalise l'UX mobile.`,
        value: viewport,
        recommendation: `Retirez user-scalable=no et maximum-scale=1. Utilisez uniquement : <meta name="viewport" content="width=device-width, initial-scale=1">.`,
      });
    } else if (!hasDeviceWidth) {
      checks.push({
        id: "tech-viewport-wrong",
        category: "technical",
        name: "Viewport incorrect",
        status: "warn",
        severity: "medium",
        description: `Viewport : "${viewport}". Manque width=device-width — le site risque d'être mal rendu sur mobile.`,
        value: viewport,
        recommendation: `Utilisez : <meta name="viewport" content="width=device-width, initial-scale=1">.`,
      });
    } else {
      checks.push({
        id: "tech-viewport",
        category: "technical",
        name: "Meta viewport",
        status: "pass",
        description: `Viewport correctement configurée : "${viewport}"`,
        value: viewport,
      });
    }
  }

  // Language on <html>
  const lang = extractLangAttribute(html);
  checks.push({
    id: "tech-lang",
    category: "technical",
    name: "Attribut lang sur <html>",
    status: lang ? "pass" : "warn",
    severity: lang ? undefined : "low",
    description: lang ? `Langue déclarée : ${lang}` : "Aucun attribut lang sur <html>. Les screen readers et Google ne savent pas identifier la langue.",
    value: lang || undefined,
    recommendation: !lang ? 'Ajoutez <html lang="fr"> (ou votre locale) pour l\'accessibilité et le SEO.' : undefined,
  });

  // X-Robots-Tag header (override meta robots)
  const xRobotsTag = headers.get("x-robots-tag");
  if (xRobotsTag && /noindex/i.test(xRobotsTag)) {
    checks.push({
      id: "tech-x-robots-noindex",
      category: "technical",
      name: "X-Robots-Tag: noindex",
      status: "fail",
      severity: "critical",
      description: `Le serveur envoie X-Robots-Tag: ${xRobotsTag}. Cette en-tête override la meta robots — la page NE SERA PAS indexée, quelle que soit la balise dans le HTML.`,
      value: xRobotsTag,
      recommendation: "Retirez cette en-tête de votre serveur (nginx : supprimez `add_header X-Robots-Tag`) ou limitez-la aux chemins `/admin/`.",
    });
  } else if (xRobotsTag) {
    checks.push({
      id: "tech-x-robots",
      category: "technical",
      name: "X-Robots-Tag",
      status: "info",
      description: `En-tête X-Robots-Tag présente : ${xRobotsTag}`,
      value: xRobotsTag,
    });
  }

  return checks;
}

// =============================================================================
// 2. ON-PAGE CHECKS
// =============================================================================

function checkOnPage(
  html: string,
  metas: { key: string; value: string }[],
  headings: { tag: string; text: string }[],
  internalLinkCount: number,
  totalWords: number,
  siteType: ReturnType<typeof detectSiteContext>["type"]
): AuditCheck[] {
  const checks: AuditCheck[] = [];
  const policy = severityPolicyFor(siteType);

  // Title
  const title = extractPageTitle(html);
  const titleLen = title ? title.length : 0;
  let titleStatus: AuditCheck["status"] = "pass";
  let titleSev: AuditCheck["severity"];
  if (!title) {
    titleStatus = "fail";
    titleSev = "critical";
  } else if (titleLen < 25 || titleLen > 65) {
    titleStatus = "warn";
    titleSev = "medium";
  }
  checks.push({
    id: "onpage-title",
    category: "onpage",
    name: "Balise <title>",
    status: titleStatus,
    severity: titleSev,
    description: !title
      ? "Balise <title> absente — Google utilisera un titre généré, souvent médiocre."
      : `Title (${titleLen} caractères) : "${title.length > 80 ? title.substring(0, 80) + "…" : title}"`,
    value: title || "Absente",
    recommendation:
      !title
        ? "Ajoutez un <title> unique par page, 50-60 caractères, avec le mot-clé principal en début."
        : titleLen < 25
          ? "Titre trop court — visez 50-60 caractères."
          : titleLen > 65
            ? "Titre trop long — risque de troncature dans les SERP. Raccourcissez à 60 caractères."
            : undefined,
  });

  // Meta description
  const metaDesc = getMetaContent(metas, "description");
  const descLen = metaDesc ? metaDesc.length : 0;
  let descStatus: AuditCheck["status"] = "pass";
  let descSev: AuditCheck["severity"];
  if (!metaDesc) {
    descStatus = "fail";
    descSev = "high";
  } else if (descLen < 110 || descLen > 170) {
    descStatus = "warn";
    descSev = "low";
  }
  checks.push({
    id: "onpage-metadesc",
    category: "onpage",
    name: "Meta description",
    status: descStatus,
    severity: descSev,
    description: !metaDesc
      ? "Meta description absente — Google génère un snippet depuis le contenu, souvent moins engageant."
      : `Meta description (${descLen} caractères)`,
    value: metaDesc || undefined,
    recommendation: !metaDesc
      ? "Ajoutez une meta description 120-160 caractères avec un call-to-action clair."
      : descLen < 110
        ? "Description trop courte. Visez 120-160 caractères."
        : descLen > 170
          ? "Description trop longue — risque de troncature. Limitez à 160 caractères."
          : undefined,
  });

  // H1
  const h1s = headings.filter((h) => h.tag === "H1");
  let h1Status: AuditCheck["status"] = "pass";
  let h1Sev: AuditCheck["severity"];
  if (h1s.length === 0) {
    h1Status = "fail";
    h1Sev = "high";
  } else if (h1s.length > policy.maxH1s.warn) {
    h1Status = h1s.length > policy.maxH1s.fail ? "fail" : "warn";
    h1Sev = "medium";
  }
  checks.push({
    id: "onpage-h1",
    category: "onpage",
    name: "Balise H1",
    status: h1Status,
    severity: h1Sev,
    description:
      h1s.length === 0
        ? "Aucune balise H1 détectée."
        : h1s.length === 1
          ? `H1 unique : "${h1s[0].text.substring(0, 80)}"`
          : `${h1s.length} balises H1 détectées — HTML5 l'autorise mais une seule reste la meilleure pratique SEO.`,
    value: h1s.map((h) => h.text).slice(0, 3).join(" | "),
    recommendation:
      h1s.length === 0
        ? "Ajoutez un H1 unique contenant le mot-clé principal."
        : h1s.length > 1
          ? "Gardez un seul H1 par page pour un signal clair au moteur."
          : undefined,
  });

  // Heading hierarchy
  const tagSeq = headings.map((h) => parseInt(h.tag.replace("H", "")));
  const hasSkip = tagSeq.some((cur, i) => i > 0 && cur > tagSeq[i - 1] + 1);
  if (headings.length > 0) {
    checks.push({
      id: "onpage-heading-structure",
      category: "onpage",
      name: "Hiérarchie des titres (Hn)",
      status: hasSkip ? "warn" : "pass",
      severity: hasSkip ? "low" : undefined,
      description: hasSkip
        ? "Des sauts de niveau ont été détectés (ex : H1 → H3 sans H2). Impact mineur sur le SEO mais négatif pour l'accessibilité."
        : `Hiérarchie cohérente (${headings.length} titres).`,
      value: headings.slice(0, 8).map((h) => h.tag).join(" > "),
    });
  }

  // Meta robots
  const metaRobots = getMetaContent(metas, "robots");
  const isNoindex = metaRobots && /noindex/i.test(metaRobots);
  const isNofollow = metaRobots && /nofollow/i.test(metaRobots);
  if (isNoindex) {
    checks.push({
      id: "onpage-meta-robots",
      category: "onpage",
      name: "Meta robots : noindex",
      status: "fail",
      severity: "critical",
      description: `La page est en noindex : "${metaRobots}". Elle ne sera JAMAIS indexée par Google.`,
      value: metaRobots,
      recommendation: "Retirez `noindex` de la meta robots si vous souhaitez apparaître dans les SERP.",
    });
  } else if (isNofollow) {
    checks.push({
      id: "onpage-meta-robots",
      category: "onpage",
      name: "Meta robots : nofollow",
      status: "warn",
      severity: "medium",
      description: `Meta robots = "${metaRobots}". Les liens de la page ne transmettent pas de PageRank.`,
      value: metaRobots,
      recommendation: "Vérifiez que `nofollow` est intentionnel (page de login, utilisateur, etc.).",
    });
  } else if (metaRobots) {
    checks.push({
      id: "onpage-meta-robots",
      category: "onpage",
      name: "Meta robots",
      status: "pass",
      description: `Meta robots : "${metaRobots}".`,
      value: metaRobots,
    });
  }

  // Content length — context-aware
  let contentStatus: AuditCheck["status"] = "pass";
  let contentSev: AuditCheck["severity"];
  if (totalWords < policy.minWordCount.fail) {
    contentStatus = "fail";
    contentSev = "high";
  } else if (totalWords < policy.minWordCount.warn) {
    contentStatus = "warn";
    contentSev = "medium";
  }
  checks.push({
    id: "onpage-content-length",
    category: "onpage",
    name: "Longueur du contenu",
    status: contentStatus,
    severity: contentSev,
    description: `~${totalWords} mots détectés. Attendu pour ce type de site (${siteType}) : min ${policy.minWordCount.warn} mots.`,
    value: `${totalWords} mots`,
    recommendation:
      contentStatus !== "pass"
        ? "Enrichissez le contenu avec des exemples concrets, des cas clients, des comparatifs. Minimum 600-800 mots pour un article SEO."
        : undefined,
  });

  // Internal links — context-aware
  let linksStatus: AuditCheck["status"] = "pass";
  let linksSev: AuditCheck["severity"];
  if (internalLinkCount < policy.minInternalLinks.fail) {
    linksStatus = "fail";
    linksSev = "high";
  } else if (internalLinkCount < policy.minInternalLinks.warn) {
    linksStatus = "warn";
    linksSev = "low";
  }
  checks.push({
    id: "onpage-internal-links",
    category: "onpage",
    name: "Maillage interne",
    status: linksStatus,
    severity: linksSev,
    description: `${internalLinkCount} lien(s) interne(s) détecté(s).`,
    value: `${internalLinkCount} liens`,
    recommendation:
      linksStatus !== "pass"
        ? "Ajoutez des liens contextuels vers vos autres pages (cluster thématique, maillage des piliers)."
        : undefined,
  });

  // Open Graph completeness (title/description/image — image validated separately)
  const ogTitle = getMetaContent(metas, "og:title");
  const ogDesc = getMetaContent(metas, "og:description");
  const ogImage = getMetaContent(metas, "og:image");
  const ogCount = [ogTitle, ogDesc, ogImage].filter(Boolean).length;
  if (ogCount < 3) {
    checks.push({
      id: "onpage-og",
      category: "onpage",
      name: "Open Graph (partage social)",
      status: ogCount === 0 ? "warn" : "info",
      severity: ogCount === 0 ? "low" : undefined,
      description: `Open Graph : ${ogCount}/3 balises essentielles présentes (og:title, og:description, og:image).`,
      value: `og:title=${ogTitle ? "✓" : "✗"} og:description=${ogDesc ? "✓" : "✗"} og:image=${ogImage ? "✓" : "✗"}`,
      recommendation: "Complétez les 3 balises OG pour soigner l'apparence sur Facebook, LinkedIn, Discord, Slack, etc.",
    });
  }

  // Twitter Card
  const twitterCard = getMetaContent(metas, "twitter:card");
  if (!twitterCard) {
    checks.push({
      id: "onpage-twitter",
      category: "onpage",
      name: "Twitter Card",
      status: "info",
      description: "Aucune balise twitter:card. Twitter/X utilisera les balises OG en fallback.",
      recommendation: "Optionnel : ajoutez <meta name=\"twitter:card\" content=\"summary_large_image\"> pour une apparence optimale sur X.",
    });
  }

  // Images alt — ignore decorative
  const imgs = parseImgTags(html);
  const meaningful = imgs.filter((i) => !i.decorative);
  const withAlt = meaningful.filter((i) => i.alt && i.alt.trim().length >= 3);
  const missingAlt = meaningful.length - withAlt.length;
  if (meaningful.length > 0) {
    let imgStatus: AuditCheck["status"] = "pass";
    let imgSev: AuditCheck["severity"];
    if (missingAlt > 0 && missingAlt >= meaningful.length * 0.3) {
      imgStatus = "fail";
      imgSev = "high";
    } else if (missingAlt > 0) {
      imgStatus = "warn";
      imgSev = "medium";
    }
    checks.push({
      id: "onpage-img-alt",
      category: "onpage",
      name: "Attribut alt des images",
      status: imgStatus,
      severity: imgSev,
      description:
        missingAlt === 0
          ? `Toutes les ${meaningful.length} images porteuses ont un alt descriptif.`
          : `${missingAlt}/${meaningful.length} images porteuses sans alt (hors décoratives).`,
      value: `${withAlt.length}/${meaningful.length}`,
      recommendation:
        missingAlt > 0
          ? "Ajoutez un attribut alt descriptif à chaque image porteuse de sens. Utilisez alt=\"\" pour les décoratives."
          : undefined,
    });
  }

  // Modern image formats
  if (imgs.length > 0) {
    const modern = imgs.filter((i) => /\.(webp|avif)/i.test(i.src) || i.fromNextImage);
    const ratio = modern.length / imgs.length;
    if (ratio < 0.5) {
      checks.push({
        id: "onpage-img-format",
        category: "onpage",
        name: "Formats modernes (WebP/AVIF)",
        status: "info",
        description: `${modern.length}/${imgs.length} images en format moderne. Les formats legacy (JPG/PNG) pèsent 30-50 % de plus.`,
        recommendation: "Convertissez vos images en WebP ou servez-les via next/image, Cloudflare Images, etc.",
      });
    }
  }

  // CLS prevention — width/height sur images
  const imgsWithoutDims = imgs.filter((i) => !i.fromNextImage && (!i.width || !i.height));
  if (imgs.length > 3 && imgsWithoutDims.length / imgs.length > 0.5) {
    checks.push({
      id: "onpage-img-dimensions",
      category: "onpage",
      name: "Images sans dimensions",
      status: "warn",
      severity: "low",
      description: `${imgsWithoutDims.length}/${imgs.length} images sans width+height. Impact sur le Cumulative Layout Shift (CLS).`,
      recommendation: "Ajoutez width et height explicites pour réserver l'espace avant le chargement — améliore le score CLS.",
    });
  }

  return checks;
}

// =============================================================================
// 3. PERFORMANCE CHECKS
// =============================================================================

function checkPerformance(html: string): AuditCheck[] {
  const checks: AuditCheck[] = [];
  const cleanedHtml = stripScriptsAndStyles(html);

  // Render-blocking CSS — detect <link rel="stylesheet"> without media="print"
  const blockingCss = (html.match(/<link\b[^>]+rel\s*=\s*["']stylesheet["'][^>]*>/gi) || []).filter(
    (tag) => !/media\s*=\s*["'](?:print|speech)["']/i.test(tag)
  ).length;
  // Render-blocking JS — <script src="…"> without async/defer/type=module
  const scriptsWithSrc = html.match(/<script\b[^>]*\bsrc\s*=\s*["'][^"']+["'][^>]*>/gi) || [];
  const blockingJs = scriptsWithSrc.filter(
    (tag) => !/\b(async|defer|type\s*=\s*["']module["']|nomodule)\b/i.test(tag)
  ).length;
  const blockingTotal = blockingCss + blockingJs;
  if (blockingTotal > 0) {
    const status: AuditCheck["status"] = blockingTotal > 5 ? "fail" : blockingTotal > 2 ? "warn" : "info";
    const severity: AuditCheck["severity"] = status === "fail" ? "high" : status === "warn" ? "medium" : undefined;
    checks.push({
      id: "perf-render-blocking",
      category: "performance",
      name: "Ressources render-blocking",
      status,
      severity,
      description: `${blockingCss} CSS + ${blockingJs} JS bloquent le first paint.`,
      value: `CSS: ${blockingCss} | JS: ${blockingJs}`,
      recommendation: "Ajoutez async/defer aux scripts et inlinez le critical CSS above-the-fold.",
    });
  } else {
    checks.push({
      id: "perf-render-blocking",
      category: "performance",
      name: "Ressources render-blocking",
      status: "pass",
      description: "Aucune ressource bloquante détectée.",
    });
  }

  // Lazy loading — only on non-LCP images (above-the-fold should NOT be lazy)
  const allImgs = html.match(/<img\b[^>]*>/gi) || [];
  const lazyImgs = allImgs.filter((t) => /loading\s*=\s*["']lazy["']/i.test(t));
  if (allImgs.length > 5 && lazyImgs.length < allImgs.length * 0.5) {
    checks.push({
      id: "perf-lazy-loading",
      category: "performance",
      name: "Lazy loading des images",
      status: "info",
      description: `${lazyImgs.length}/${allImgs.length} images avec loading="lazy". L'image LCP (above-the-fold) ne doit PAS être lazy.`,
      recommendation: "Marquez lazy toutes les images sous le fold (`loading=\"lazy\"`), et priority (`fetchpriority=\"high\"`) pour l'image hero.",
    });
  }

  // Resource hints
  const hasPreconnect = /rel\s*=\s*["'](?:preconnect|dns-prefetch)["']/i.test(cleanedHtml);
  const hasPreload = /rel\s*=\s*["']preload["']/i.test(cleanedHtml);
  if (!hasPreconnect && !hasPreload) {
    checks.push({
      id: "perf-resource-hints",
      category: "performance",
      name: "Resource hints (preconnect, preload)",
      status: "info",
      description: "Aucun preconnect/preload détecté. Hints optionnels mais améliorent le LCP sur sites avec CDN/fonts tiers.",
      recommendation: "Ajoutez <link rel=\"preconnect\" href=\"https://cdn.exemple.com\"> pour vos domaines tiers critiques.",
    });
  }

  return checks;
}

// =============================================================================
// 4. OFF-PAGE / E-E-A-T CHECKS
// =============================================================================

function checkOffPage(html: string, _metas: { key: string; value: string }[], links: ReturnType<typeof parseLinkTags>): AuditCheck[] {
  void _metas;
  const checks: AuditCheck[] = [];

  // Favicon
  const favicon = links.find((l) =>
    /\b(icon|shortcut icon|apple-touch-icon)\b/i.test(l.rel)
  );
  checks.push({
    id: "offpage-favicon",
    category: "offpage",
    name: "Favicon",
    status: favicon ? "pass" : "info",
    description: favicon ? "Favicon défini." : "Aucun favicon détecté. Impact mineur mais visible dans les onglets et les SERP.",
    recommendation: !favicon ? `Ajoutez <link rel="icon" href="/favicon.ico">` : undefined,
  });

  // Social presence — detect profile links in actual href (not just text mentions)
  const socialPatterns = [
    { name: "Facebook", re: /<a\b[^>]+href=["'][^"']*(?:facebook\.com|fb\.com)\//i },
    { name: "Twitter/X", re: /<a\b[^>]+href=["'][^"']*(?:twitter\.com|x\.com)\//i },
    { name: "LinkedIn", re: /<a\b[^>]+href=["'][^"']*linkedin\.com\//i },
    { name: "Instagram", re: /<a\b[^>]+href=["'][^"']*instagram\.com\//i },
    { name: "YouTube", re: /<a\b[^>]+href=["'][^"']*youtube\.com\//i },
    { name: "TikTok", re: /<a\b[^>]+href=["'][^"']*tiktok\.com\//i },
  ];
  const found = socialPatterns.filter((p) => p.re.test(html)).map((p) => p.name);
  checks.push({
    id: "offpage-social",
    category: "offpage",
    name: "Liens vers profils sociaux",
    status: found.length >= 2 ? "pass" : "info",
    description:
      found.length > 0
        ? `Profils sociaux détectés : ${found.join(", ")}.`
        : "Aucun lien vers des profils sociaux détecté.",
    value: found.join(", ") || undefined,
    recommendation:
      found.length < 2
        ? "Ajoutez des liens vers vos profils sociaux officiels pour renforcer l'E-E-A-T."
        : undefined,
  });

  // Analytics
  const hasAnalytics =
    /google-analytics\.com|\bgtag\s*\(|googletagmanager\.com\/gtm|umami|matomo|plausible|fathom/i.test(html);
  checks.push({
    id: "offpage-analytics",
    category: "offpage",
    name: "Outil d'analytics",
    status: hasAnalytics ? "pass" : "info",
    description: hasAnalytics
      ? "Un outil d'analytics a été détecté."
      : "Aucun outil d'analytics détecté. Impossible de mesurer votre ROI SEO.",
    recommendation: !hasAnalytics
      ? "Installez un outil : GA4, Plausible ou Umami (RGPD-friendly)."
      : undefined,
  });

  // Author schema / E-E-A-T signals
  const hasAuthorSchema =
    /"@type"\s*:\s*"(?:Person|Author)"/i.test(html) ||
    /itemprop\s*=\s*["']author["']/i.test(html);
  checks.push({
    id: "offpage-eeat",
    category: "offpage",
    name: "Signal E-E-A-T (auteur identifié)",
    status: hasAuthorSchema ? "pass" : "info",
    description: hasAuthorSchema
      ? "Un auteur structuré est référencé (Schema Person ou itemprop author)."
      : "Aucun auteur identifié structurellement. Important pour YMYL (finance, santé) et Helpful Content.",
    recommendation: !hasAuthorSchema
      ? "Ajoutez Schema Person sur les pages d'auteur et liez-les via Schema Article > author."
      : undefined,
  });

  return checks;
}

// =============================================================================
// SCORE CALCULATION (normalised)
// =============================================================================

function scoreFromChecks(checks: AuditCheck[]): { score: number; grade: string } {
  // Scoring is count-based and normalised (same algorithm as security audit):
  // pass = 1, warn = 0.4, fail = 0, info ignored. score = avg × 100.
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
  technical: "Technique",
  onpage: "On-Page",
  performance: "Performance",
  offpage: "Off-Page / E-E-A-T",
  headers: "En-têtes",
  infra: "Infrastructure",
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
    const origin = parsedUrl.origin;
    const isHttps = parsedUrl.protocol === "https:";

    // Fetch the page
    const startTime = Date.now();
    const response = await safeFetch(targetUrl, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TheWebmaster-SeoAudit/2.0; +https://thewebmaster.pro)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
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
    const pageSize = new Blob([html]).size;

    // Shared parsed structures
    const metas = parseMetaTags(html);
    const linkTags = parseLinkTags(html);
    const headings = extractHeadings(html);
    const anchors = parseAnchorTags(html);
    const { internal, external } = categorizeLinks(anchors, targetUrl);
    const imgs = parseImgTags(html);
    const meaningfulImgs = imgs.filter((i) => !i.decorative);
    const textContent = extractVisibleText(html);
    const totalWords = wordCount(textContent);

    // Schema.org parsing (reused by site-context detection)
    const jsonLdResult = validateJsonLd(html);

    // Detect stack + site type
    const technologies = detectTechnologies(html, headers);
    const stackInfo = detectStack(html, headers, technologies);
    const siteContext = detectSiteContext({
      url: targetUrl,
      html,
      jsonLdTypes: jsonLdResult.types,
      headings,
      wordCount: totalWords,
      internalLinkCount: internal.length,
      cmsName: stackInfo.cms,
    });

    // Multi-page crawl (sitemap + heuristic routes) — best-effort
    let crawledRoutes: string[] = [];
    try {
      crawledRoutes = await discoverRoutes(targetUrl, 5);
    } catch {}

    // Run external / async checks in parallel. PSI + link check are optional
    // (network-dependent) and time-capped inside their respective modules.
    const [
      technicalChecks,
      sitemapChecks,
      hreflangChecks,
      ogImageChecks,
      brokenLinkResult,
      pagespeedChecks,
    ] = await Promise.all([
      checkTechnical(targetUrl, html, headers, responseTime),
      checkSitemap(origin),
      validateHreflang(targetUrl, html),
      checkOgImage(getMetaContent(metas, "og:image"), targetUrl),
      checkBrokenLinks(html, targetUrl, 40),
      checkPageSpeed(targetUrl),
    ]);

    // Sync checks
    const onPageChecks = checkOnPage(html, metas, headings, internal.length, totalWords, siteContext.type);
    const performanceChecks = checkPerformance(html);
    const offPageChecks = checkOffPage(html, metas, linkTags);

    // Robots.txt check (with soft 404 detection)
    const robotsChecks = await checkRobotsTxt(origin);

    const baseChecks: AuditCheck[] = [
      ...technicalChecks,
      ...sitemapChecks,
      ...robotsChecks,
      ...hreflangChecks,
      ...jsonLdResult.checks,
      ...onPageChecks,
      ...brokenLinkResult.checks,
      ...ogImageChecks,
      ...pagespeedChecks,
      ...performanceChecks,
      ...offPageChecks,
    ];

    // Enrich with compliance + stack-aware remediations
    const enrichedChecks = enhanceWithStackRemediations(
      enrichWithCompliance(baseChecks),
      stackInfo
    );

    const { score, grade, status, categoryScores } = calculateScore(enrichedChecks);
    const actionPlan = buildActionPlan(enrichedChecks, 10);

    const hasTracking = /google-analytics|gtm\.js|plausible|umami|matomo/i.test(html);
    const threatModel = buildSeoThreatModel(
      stackInfo,
      siteContext.type,
      hasTracking,
      enrichedChecks.map((c) => ({ id: c.id, status: c.status }))
    );

    // Regression detection vs previous audit of same site
    let regressions: Regression[] = [];
    try {
      const previous = getPreviousAudit(targetUrl, "seo");
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
        regressions = regressions.slice(0, 10);
      }
    } catch {}

    const seoMeta: SeoMeta = {
      title: extractPageTitle(html),
      description: getMetaContent(metas, "description"),
      canonical: getLinksByRel(linkTags, "canonical")[0]?.href || null,
      ogImage: getMetaContent(metas, "og:image"),
      language: extractLangAttribute(html),
      robots: getMetaContent(metas, "robots"),
    };

    // Persist the audit report for regression tracking + sharing
    let reportId: string | undefined;
    try {
      reportId = insertAuditReport({
        siteUrl: targetUrl,
        score,
        grade,
        auditType: "seo",
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
          seoMeta,
          headings: headings.slice(0, 30),
          links: { internal: internal.length, external: external.length, broken: brokenLinkResult.broken.length },
          images: {
            total: imgs.length,
            withAlt: meaningfulImgs.filter((i) => i.alt && i.alt.trim().length >= 3).length,
            withoutAlt: meaningfulImgs.filter((i) => !i.alt || i.alt.trim().length < 3).length,
          },
          pageSize,
          siteContext,
        },
      });
    } catch {}

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
      cmsInfo: null,
      stack: stackInfo,
      actionPlan,
      threatModel,
      regressions,
      crawledRoutes,
      seoMeta,
      headings: headings.slice(0, 30),
      links: { internal: internal.length, external: external.length, broken: 0 },
      images: {
        total: imgs.length,
        withAlt: meaningfulImgs.filter((i) => i.alt && i.alt.trim().length >= 3).length,
        withoutAlt: meaningfulImgs.filter((i) => !i.alt || i.alt.trim().length < 3).length,
      },
      pageSize,
      siteContext,
      reportId,
      publicUrl: reportId ? `/seo-audit/r/${reportId}` : undefined,
    };

    // Track
    try {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      insertAuditRequest({
        siteUrl: result.url,
        auditType: "seo",
        score: result.score,
        grade: result.grade,
        ipAddress: ip,
      });
    } catch {}

    return NextResponse.json(result);
  } catch (error) {
    console.error("[SEO Audit] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de l'analyse SEO" },
      { status: 500 }
    );
  }
}

// =============================================================================
// ROBOTS.TXT CHECK — validates content-type + Disallow semantics
// =============================================================================

// Parses robots.txt into groups-by-user-agent and returns true if the `*`
// (or missing) group disallows the root path. More lenient than a single
// regex — handles CRLF, trailing whitespace, comments, and group ordering.
function detectFullBlockForWildcard(body: string): boolean {
  const lines = body.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim());
  let inWildcard = false;
  let sawWildcard = false;
  for (const line of lines) {
    if (!line) continue;
    const uaMatch = line.match(/^User-agent:\s*(.+)$/i);
    if (uaMatch) {
      const ua = uaMatch[1].trim();
      inWildcard = ua === "*";
      if (inWildcard) sawWildcard = true;
      continue;
    }
    if (inWildcard) {
      const disallow = line.match(/^Disallow:\s*(.*)$/i);
      if (disallow) {
        const path = disallow[1].trim();
        if (path === "/" || path === "/*") return true;
      }
    }
  }
  return sawWildcard ? false : false;
}

async function checkRobotsTxt(origin: string): Promise<AuditCheck[]> {
  const url = `${origin}/robots.txt`;
  const res = await safeFetch(url, { timeout: 5000 });
  if (!res || !res.ok) {
    return [
      {
        id: "tech-robots",
        category: "technical",
        name: "robots.txt",
        status: "warn",
        severity: "low",
        description: "Aucun fichier robots.txt accessible.",
        recommendation: "Ajoutez /robots.txt pour guider les crawlers. Sur Next.js : `app/robots.ts`.",
      },
    ];
  }

  const contentType = res.headers.get("content-type") || "";
  const body = await res.text();

  // Soft 404 detection : HTML as robots.txt = bogus
  const looksLikeHtml =
    /text\/html/i.test(contentType) || /^<!doctype html|<html/i.test(body.trim());
  if (looksLikeHtml) {
    return [
      {
        id: "tech-robots-soft-404",
        category: "technical",
        name: "robots.txt soft 404",
        status: "fail",
        severity: "medium",
        description: `/robots.txt renvoie du HTML au lieu du contenu plain-text — Google considère cela comme un 404.`,
        value: url,
        recommendation: "Retournez un vrai text/plain ou un 404. Sur Next.js : `app/robots.ts` avec MetadataRoute.Robots.",
      },
    ];
  }

  // Disallow: / blocks entire site. We parse by User-agent block to avoid
  // false positives (a Disallow: / under a specific bot doesn't block Googlebot).
  const fullBlock = detectFullBlockForWildcard(body);
  if (fullBlock) {
    return [
      {
        id: "tech-robots-block-all",
        category: "technical",
        name: "robots.txt bloque tout le site",
        status: "fail",
        severity: "critical",
        description: "`Disallow: /` dans robots.txt empêche TOUT crawl. Le site ne sera pas indexé.",
        value: url,
        recommendation: "Supprimez cette règle sauf si le site est en cours de développement.",
      },
    ];
  }

  // Sitemap declared in robots.txt
  const hasSitemapDecl = /^\s*Sitemap:\s*https?:\/\//im.test(body);

  return [
    {
      id: "tech-robots",
      category: "technical",
      name: "robots.txt",
      status: "pass",
      description: hasSitemapDecl
        ? "robots.txt valide avec déclaration Sitemap."
        : "robots.txt accessible et valide.",
      value: url,
      recommendation: !hasSitemapDecl
        ? "Ajoutez `Sitemap: https://votredomaine.com/sitemap.xml` à la fin du robots.txt pour aider le crawl."
        : undefined,
    },
  ];
}
