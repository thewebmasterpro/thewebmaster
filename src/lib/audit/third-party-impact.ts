// Third-party script impact analysis: identifies the external domains loaded,
// classifies them by category (analytics, ads, chat, CDN, fonts), counts
// how many are render-blocking, and emits a single consolidated budget check.

import type { AuditCheck } from "@/types/audit";

interface ThirdParty {
  domain: string;
  count: number;
  category: "analytics" | "ads" | "chat" | "social" | "fonts" | "cdn" | "tag-manager" | "a/b-testing" | "other";
  blocking: boolean;
}

// Classification signals — domain patterns mapped to category.
const CATEGORY_PATTERNS: { category: ThirdParty["category"]; patterns: RegExp[] }[] = [
  { category: "analytics", patterns: [/google-analytics\.com$/, /googletagmanager\.com$/, /plausible\.io$/, /static\.hotjar\.com$/, /script\.hotjar\.com$/, /matomo\./, /piwik\./, /amplitude\.com$/, /mixpanel\.com$/, /segment\.(com|io)$/, /fathom\.cdn/, /clarity\.ms$/, /analytics\..+/, /cdn\.heapanalytics\.com$/] },
  { category: "tag-manager", patterns: [/googletagmanager\.com\/gtm\.js/, /tagmanager\.google\.com$/, /launch\.adobe\.dtm\.com$/] },
  { category: "ads", patterns: [/doubleclick\.net$/, /googlesyndication\.com$/, /googleadservices\.com$/, /criteo\.com$/, /taboola\.com$/, /outbrain\.com$/, /adsystem\./] },
  { category: "chat", patterns: [/intercom\.(io|com)$/, /messenger\.providesupport\.com$/, /drift\.com$/, /tawk\.to$/, /crisp\.chat$/, /livechatinc\.com$/, /hubspotusercontent/, /zendesk\.com$/, /freshchat\.com$/] },
  { category: "social", patterns: [/connect\.facebook\.net$/, /twitter\.com$/, /platform\.linkedin\.com$/, /apis\.google\.com$/, /disqus\.com$/] },
  { category: "fonts", patterns: [/fonts\.googleapis\.com$/, /fonts\.gstatic\.com$/, /use\.typekit\.net$/, /use\.fontawesome\.com$/] },
  { category: "cdn", patterns: [/cdn\.jsdelivr\.net$/, /unpkg\.com$/, /cdnjs\.cloudflare\.com$/, /code\.jquery\.com$/, /ajax\.googleapis\.com$/, /cdn\.shopify\.com$/] },
  { category: "a/b-testing", patterns: [/optimizely\.com$/, /ab\.tasty\.com$/, /abtasty\.com$/, /kameleoon\.com$/, /vwo\.com$/] },
];

function classifyDomain(domain: string): ThirdParty["category"] {
  for (const { category, patterns } of CATEGORY_PATTERNS) {
    if (patterns.some((p) => p.test(domain))) return category;
  }
  return "other";
}

interface ResourceRef {
  url: string;
  blocking: boolean;
}

function extractExternalResources(html: string, pageHostname: string): ResourceRef[] {
  const refs: ResourceRef[] = [];

  // Scripts
  const scriptRegex = /<script\b([^>]*)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    const pre = match[1];
    const src = match[2];
    const post = match[3];
    const attrs = pre + post;
    if (src.startsWith("data:") || src.startsWith("javascript:")) continue;
    const blocking =
      !/\basync\b/i.test(attrs) &&
      !/\bdefer\b/i.test(attrs) &&
      !/\btype\s*=\s*["']module["']/i.test(attrs);
    try {
      const resolved = new URL(src, `https://${pageHostname}`);
      if (resolved.hostname !== pageHostname && !resolved.hostname.endsWith("." + pageHostname)) {
        refs.push({ url: resolved.toString(), blocking });
      }
    } catch {}
  }

  // Stylesheets
  const linkRegex = /<link\b[^>]*\brel\s*=\s*["']stylesheet["'][^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    try {
      const resolved = new URL(href, `https://${pageHostname}`);
      if (resolved.hostname !== pageHostname && !resolved.hostname.endsWith("." + pageHostname)) {
        refs.push({ url: resolved.toString(), blocking: true });
      }
    } catch {}
  }

  return refs;
}

export function checkThirdPartyImpact(html: string, baseUrl: string): AuditCheck[] {
  let pageHostname = "";
  try {
    pageHostname = new URL(baseUrl).hostname;
  } catch {
    return [];
  }

  const refs = extractExternalResources(html, pageHostname);
  if (refs.length === 0) {
    return [
      {
        id: "perf-third-party",
        category: "resources",
        name: "Scripts tiers",
        status: "pass",
        description: "Aucun script ou feuille de style tierce détectée — charge réseau minimale.",
      },
    ];
  }

  // Group by domain
  const byDomain = new Map<string, ThirdParty>();
  for (const ref of refs) {
    try {
      const host = new URL(ref.url).hostname;
      const existing = byDomain.get(host);
      if (existing) {
        existing.count++;
        if (ref.blocking) existing.blocking = true;
      } else {
        byDomain.set(host, { domain: host, count: 1, category: classifyDomain(host), blocking: ref.blocking });
      }
    } catch {}
  }

  const parties = [...byDomain.values()].sort((a, b) => b.count - a.count);
  const blockingCount = parties.filter((p) => p.blocking).length;
  const adsCount = parties.filter((p) => p.category === "ads").length;
  const checks: AuditCheck[] = [];

  // Overall budget
  let status: AuditCheck["status"] = "pass";
  let severity: AuditCheck["severity"];
  if (parties.length > 20 || blockingCount > 5) {
    status = "fail";
    severity = "high";
  } else if (parties.length > 10 || blockingCount > 2) {
    status = "warn";
    severity = "medium";
  }

  checks.push({
    id: "perf-third-party-count",
    category: "resources",
    name: "Tiers chargés par la page",
    status,
    severity,
    description: `${parties.length} domaine(s) tiers : ${blockingCount} bloquant(s) le rendu. Chaque tiers = DNS + TLS handshake + téléchargement avant contribution au first paint.`,
    value: parties.slice(0, 5).map((p) => `${p.domain} (${p.category}, ×${p.count}${p.blocking ? ", blocking" : ""})`).join(" | "),
    recommendation:
      status === "fail"
        ? "Le poids des tiers est excessif. Auditez leur impact business réel (analytics × 3, A/B testing × 2 = fréquent et inutile). Tag Manager consolide souvent plusieurs scripts en un seul."
        : status === "warn"
          ? "Regroupez analytics + pixels dans un seul Tag Manager ; retardez l'initialisation des chats après user interaction."
          : undefined,
  });

  // Ads specifically — heavy
  if (adsCount >= 2) {
    checks.push({
      id: "perf-ads-heavy",
      category: "resources",
      name: "Scripts publicitaires",
      status: "warn",
      severity: "medium",
      description: `${adsCount} domaine(s) de régie publicitaire détecté(s). Les scripts ads sont connus pour bloquer le rendu, saccager le TBT et le CLS.`,
      value: parties.filter((p) => p.category === "ads").map((p) => p.domain).join(", "),
      recommendation: "Utilisez GPT/Prebid avec chargement asynchrone, reserved ad-slot sizes (anti-CLS), lazy-load les slots below-the-fold.",
    });
  }

  // Chat widgets — frequent perf killer
  const chats = parties.filter((p) => p.category === "chat");
  if (chats.length > 0) {
    checks.push({
      id: "perf-chat-widget",
      category: "resources",
      name: "Widget de chat",
      status: "info",
      description: `Widget(s) de chat : ${chats.map((p) => p.domain).join(", ")}. Pèse en général 200-500 Ko, active 2-5 TCP connections supplémentaires.`,
      recommendation: "Chargez le widget après user interaction (click sur bouton) via import dynamique, ou utilisez un polling serveur.",
    });
  }

  return checks;
}
