import type { SiteContext, SiteType } from "@/types/audit";

// Infer site type from page signals. Used to calibrate SEO check severities:
// a 200-word landing page should not be flagged "fail" like a 200-word blog.

interface Signal {
  type: SiteType;
  weight: number;
  matched: string;
}

export function detectSiteContext(params: {
  url: string;
  html: string;
  jsonLdTypes: string[];
  headings: { tag: string; text: string }[];
  wordCount: number;
  internalLinkCount: number;
  cmsName: string | null;
}): SiteContext {
  const { url, html, jsonLdTypes, wordCount, internalLinkCount, cmsName } = params;
  const lowerHtml = html.toLowerCase();
  const path = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return "/";
    }
  })();

  const signals: Signal[] = [];

  // Shopify / WooCommerce / PrestaShop → ecommerce
  if (cmsName === "Shopify" || cmsName === "PrestaShop") {
    signals.push({ type: "ecommerce", weight: 3, matched: `CMS ${cmsName}` });
  }
  if (/<body[^>]+class=["'][^"']*(?:woocommerce|single-product|shop|cart)/i.test(html)) {
    signals.push({ type: "ecommerce", weight: 2, matched: "body class woocommerce/shop" });
  }
  if (jsonLdTypes.some((t) => t === "Product" || t === "Offer" || t === "AggregateOffer")) {
    signals.push({ type: "ecommerce", weight: 3, matched: "Schema Product/Offer" });
  }
  if (/\b(add to cart|ajouter au panier|buy now|acheter)\b/i.test(lowerHtml)) {
    signals.push({ type: "ecommerce", weight: 1, matched: "CTA panier" });
  }

  // Article / blog signals
  if (jsonLdTypes.some((t) => t === "Article" || t === "BlogPosting" || t === "NewsArticle")) {
    signals.push({ type: "article", weight: 3, matched: "Schema Article" });
  }
  if (/<time\b[^>]+datetime=/i.test(html) && wordCount > 500) {
    signals.push({ type: "article", weight: 2, matched: "<time> + long contenu" });
  }
  if (/\/(blog|article|posts?|news)\//i.test(path)) {
    signals.push({ type: "article", weight: 2, matched: "URL /blog/* ou /article/*" });
  }
  if (cmsName === "WordPress" && wordCount > 800 && /rel=["']author["']/i.test(html)) {
    signals.push({ type: "article", weight: 2, matched: "WordPress + long contenu + author" });
  }

  // Landing page signals (short, CTA-heavy)
  if (path === "/" || path === "") {
    signals.push({ type: "landing", weight: 1, matched: "chemin racine" });
  }
  if (wordCount < 500 && internalLinkCount < 15) {
    signals.push({ type: "landing", weight: 2, matched: "contenu court + peu de liens" });
  }
  // Hero + CTA patterns — rough but useful
  if (/<h1[^>]*>[\s\S]{5,120}<\/h1>/i.test(html) && /\b(get started|start free|try for free|commencer|demande|contactez-nous|book a demo)\b/i.test(lowerHtml)) {
    signals.push({ type: "landing", weight: 2, matched: "CTA hero visible" });
  }

  // SaaS signals (often landing-like but with product signals)
  if (/\b(pricing|tarifs|sign up|s'inscrire|log in|se connecter)\b/i.test(lowerHtml)) {
    signals.push({ type: "saas", weight: 1, matched: "pricing/login" });
  }
  if (jsonLdTypes.includes("SoftwareApplication") || jsonLdTypes.includes("WebApplication")) {
    signals.push({ type: "saas", weight: 3, matched: "Schema SoftwareApplication" });
  }

  // Blog index (list of posts, short content per item)
  if (/\/(blog|articles?)\/?$/i.test(path) && /<article\b/gi.test(html)) {
    const articleCount = (html.match(/<article\b/gi) || []).length;
    if (articleCount >= 3) {
      signals.push({ type: "blog", weight: 3, matched: `${articleCount} <article> sur l'index` });
    }
  }

  // Corporate site (about/contact heavy, low/no ecom or blog signals)
  if (jsonLdTypes.includes("Organization") || jsonLdTypes.includes("Corporation")) {
    signals.push({ type: "corporate", weight: 2, matched: "Schema Organization" });
  }
  if (/<a\b[^>]+href=["'][^"']*\/(about|a-propos|qui-sommes-nous|team|equipe)/i.test(html) &&
      /<a\b[^>]+href=["'][^"']*\/(contact)/i.test(html) &&
      !/<h1[^>]*>.*?\b(sign up|pricing|tarifs)\b.*?<\/h1>/i.test(lowerHtml)) {
    signals.push({ type: "corporate", weight: 1, matched: "liens about + contact" });
  }

  // Tally scores
  const scores = new Map<SiteType, number>();
  for (const s of signals) {
    scores.set(s.type, (scores.get(s.type) ?? 0) + s.weight);
  }
  if (scores.size === 0) {
    return { type: "unknown", confidence: "low", signals: [] };
  }
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [topType, topScore] = sorted[0];
  const secondScore = sorted[1]?.[1] ?? 0;
  const confidence: "low" | "medium" | "high" =
    topScore >= 5 && topScore - secondScore >= 3 ? "high" : topScore >= 3 ? "medium" : "low";

  return {
    type: topType,
    confidence,
    signals: signals.filter((s) => s.type === topType).map((s) => s.matched),
  };
}

// Severity calibration by site type — tells the audit whether to flag
// "content too short" as fail/warn/info based on context.
export interface SeverityPolicy {
  minWordCount: { fail: number; warn: number };
  minInternalLinks: { fail: number; warn: number };
  maxH1s: { fail: number; warn: number };
  requiresOgImage: boolean;
  requiresSchema: boolean;
}

export function severityPolicyFor(context: SiteType): SeverityPolicy {
  switch (context) {
    case "landing":
    case "saas":
      return {
        // Landing pages: short by design — word count is NOT a failing metric
        minWordCount: { fail: 50, warn: 150 },
        minInternalLinks: { fail: 0, warn: 2 },
        maxH1s: { fail: 3, warn: 1 },
        requiresOgImage: true,
        requiresSchema: false,
      };
    case "ecommerce":
      return {
        minWordCount: { fail: 100, warn: 250 },
        minInternalLinks: { fail: 3, warn: 10 },
        maxH1s: { fail: 2, warn: 1 },
        requiresOgImage: true,
        requiresSchema: true,
      };
    case "article":
      return {
        minWordCount: { fail: 300, warn: 600 },
        minInternalLinks: { fail: 1, warn: 3 },
        maxH1s: { fail: 2, warn: 1 },
        requiresOgImage: true,
        requiresSchema: true,
      };
    case "blog":
      return {
        minWordCount: { fail: 200, warn: 500 },
        minInternalLinks: { fail: 3, warn: 10 },
        maxH1s: { fail: 2, warn: 1 },
        requiresOgImage: true,
        requiresSchema: false,
      };
    case "corporate":
      return {
        minWordCount: { fail: 150, warn: 400 },
        minInternalLinks: { fail: 3, warn: 8 },
        maxH1s: { fail: 2, warn: 1 },
        requiresOgImage: true,
        requiresSchema: false,
      };
    case "unknown":
    default:
      return {
        minWordCount: { fail: 100, warn: 300 },
        minInternalLinks: { fail: 0, warn: 3 },
        maxH1s: { fail: 2, warn: 1 },
        requiresOgImage: false,
        requiresSchema: false,
      };
  }
}
