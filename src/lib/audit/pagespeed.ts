// PageSpeed Insights integration: real Core Web Vitals (LCP, CLS, INP, FCP)
// via Google's public API. Works without an API key for ~25 req/day, or
// with GOOGLE_PAGESPEED_KEY for 25k/day.
//
// Returns graceful warn/info if the API is unreachable — we never block the
// audit on external dependencies.

import type { AuditCheck } from "@/types/audit";
import { safeFetchJson } from "./fetch";

// Reduced subset of the PageSpeed Insights v5 response — we only keep what we
// score on. The full response is huge (Lighthouse audits, loading experience,
// screenshots) — not worth typing.
interface PsiResponse {
  loadingExperience?: {
    metrics?: Record<string, { percentile: number; category: "FAST" | "AVERAGE" | "SLOW" }>;
    overall_category?: "FAST" | "AVERAGE" | "SLOW";
  };
  originLoadingExperience?: PsiResponse["loadingExperience"];
  lighthouseResult?: {
    audits?: {
      "largest-contentful-paint"?: { numericValue?: number; displayValue?: string };
      "cumulative-layout-shift"?: { numericValue?: number; displayValue?: string };
      "interactive"?: { numericValue?: number; displayValue?: string };
      "first-contentful-paint"?: { numericValue?: number; displayValue?: string };
      "speed-index"?: { numericValue?: number; displayValue?: string };
      "total-blocking-time"?: { numericValue?: number; displayValue?: string };
      "server-response-time"?: { numericValue?: number; displayValue?: string };
    };
    categories?: {
      performance?: { score: number };
      accessibility?: { score: number };
      "best-practices"?: { score: number };
      seo?: { score: number };
    };
  };
}

async function fetchPsi(url: string, strategy: "mobile" | "desktop"): Promise<PsiResponse | null> {
  const key = process.env.GOOGLE_PAGESPEED_KEY;
  const params = new URLSearchParams({
    url,
    strategy,
    category: "performance",
  });
  if (key) params.set("key", key);
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;
  return safeFetchJson<PsiResponse>(endpoint, { timeout: 25_000 });
}

function metricStatus(ms: number | undefined, good: number, needsWork: number): "pass" | "warn" | "fail" | "info" {
  if (ms === undefined) return "info";
  if (ms <= good) return "pass";
  if (ms <= needsWork) return "warn";
  return "fail";
}

function clsStatus(value: number | undefined): "pass" | "warn" | "fail" | "info" {
  if (value === undefined) return "info";
  if (value <= 0.1) return "pass";
  if (value <= 0.25) return "warn";
  return "fail";
}

function severityForStatus(status: "pass" | "warn" | "fail" | "info"): "high" | "medium" | undefined {
  if (status === "fail") return "high";
  if (status === "warn") return "medium";
  return undefined;
}

export async function checkPageSpeed(targetUrl: string): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = [];
  // Mobile-first — Google indexes mobile version exclusively since 2023
  const data = await fetchPsi(targetUrl, "mobile");

  if (!data) {
    checks.push({
      id: "cwv-psi-unavailable",
      category: "performance",
      name: "Core Web Vitals (PageSpeed Insights)",
      status: "info",
      description: "L'API PageSpeed Insights n'a pas répondu. Vérifiez GOOGLE_PAGESPEED_KEY ou ré-essayez.",
    });
    return checks;
  }

  const audits = data.lighthouseResult?.audits;
  const lcp = audits?.["largest-contentful-paint"]?.numericValue;
  const cls = audits?.["cumulative-layout-shift"]?.numericValue;
  const fcp = audits?.["first-contentful-paint"]?.numericValue;
  const tbt = audits?.["total-blocking-time"]?.numericValue;
  const sri = audits?.["speed-index"]?.numericValue;
  const sr = audits?.["server-response-time"]?.numericValue;

  // Field data — real user metrics (CrUX) when available, more authoritative than lab
  const fieldMetrics = data.loadingExperience?.metrics;
  const fieldLcp = fieldMetrics?.LARGEST_CONTENTFUL_PAINT_MS?.percentile;
  const fieldCls = fieldMetrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile;
  const fieldInp = fieldMetrics?.INTERACTION_TO_NEXT_PAINT?.percentile;

  // LCP — Google threshold: < 2500 ms good, < 4000 ms needs improvement
  const lcpValue = fieldLcp ?? lcp;
  if (lcpValue !== undefined) {
    const status = metricStatus(lcpValue, 2500, 4000);
    checks.push({
      id: "cwv-lcp",
      category: "performance",
      name: "Largest Contentful Paint (LCP)",
      status,
      severity: severityForStatus(status),
      description: `LCP ${fieldLcp !== undefined ? "(CrUX, utilisateurs réels)" : "(lab Lighthouse)"} : ${Math.round(lcpValue)} ms. Seuils Google : < 2 500 ms bon, > 4 000 ms mauvais.`,
      value: `${Math.round(lcpValue)} ms`,
      recommendation:
        status !== "pass"
          ? "Optimisez l'image LCP : preload, formats modernes, dimensions explicites, CDN. Sur Next.js : `priority` sur next/image hero."
          : undefined,
    });
  }

  // CLS — Google threshold: < 0.1 good, < 0.25 needs improvement. Note: CrUX metric is percentile × 100, normalise.
  const clsValue = fieldCls !== undefined ? fieldCls / 100 : cls;
  if (clsValue !== undefined) {
    const status = clsStatus(clsValue);
    checks.push({
      id: "cwv-cls",
      category: "performance",
      name: "Cumulative Layout Shift (CLS)",
      status,
      severity: severityForStatus(status),
      description: `CLS ${fieldCls !== undefined ? "(CrUX)" : "(lab)"} : ${clsValue.toFixed(3)}. Seuils Google : < 0.1 bon, > 0.25 mauvais.`,
      value: clsValue.toFixed(3),
      recommendation:
        status !== "pass"
          ? "Réservez l'espace pour les images (width+height), fontes (font-display: swap + size-adjust), publicités et embeds. Évitez l'injection dynamique au-dessus du fold."
          : undefined,
    });
  }

  // INP — Google's latest responsiveness metric (replaces FID since March 2024)
  if (fieldInp !== undefined) {
    const status = metricStatus(fieldInp, 200, 500);
    checks.push({
      id: "cwv-inp",
      category: "performance",
      name: "Interaction to Next Paint (INP)",
      status,
      severity: severityForStatus(status),
      description: `INP (CrUX) : ${fieldInp} ms. Seuils Google : < 200 ms bon, > 500 ms mauvais. Mesure la réactivité aux interactions.`,
      value: `${fieldInp} ms`,
      recommendation:
        status !== "pass"
          ? "Réduisez le JavaScript main-thread (code splitting, dynamic imports), évitez les listeners lourds, utilisez requestIdleCallback pour les tâches non-critiques."
          : undefined,
    });
  }

  // FCP — First Contentful Paint (supportive metric)
  if (fcp !== undefined) {
    const status = metricStatus(fcp, 1800, 3000);
    checks.push({
      id: "cwv-fcp",
      category: "performance",
      name: "First Contentful Paint (FCP)",
      status: status === "fail" ? "warn" : status,
      severity: status === "fail" ? "medium" : severityForStatus(status),
      description: `FCP : ${Math.round(fcp)} ms. Seuils Google : < 1 800 ms bon.`,
      value: `${Math.round(fcp)} ms`,
    });
  }

  // Total Blocking Time — correlated with INP, useful proxy when field data unavailable
  if (tbt !== undefined) {
    const status = metricStatus(tbt, 200, 600);
    checks.push({
      id: "cwv-tbt",
      category: "performance",
      name: "Total Blocking Time (TBT)",
      status: status === "fail" ? "warn" : status,
      severity: status === "fail" ? "medium" : severityForStatus(status),
      description: `TBT (lab) : ${Math.round(tbt)} ms — proxy d'INP quand les données terrain manquent.`,
      value: `${Math.round(tbt)} ms`,
    });
  }

  // Speed Index — secondary metric, info only
  if (sri !== undefined) {
    checks.push({
      id: "cwv-speed-index",
      category: "performance",
      name: "Speed Index",
      status: "info",
      description: `Speed Index : ${Math.round(sri)} ms (vitesse perçue de rendu).`,
      value: `${Math.round(sri)} ms`,
    });
  }

  // Overall performance score
  const perfScore = data.lighthouseResult?.categories?.performance?.score;
  if (typeof perfScore === "number") {
    const percent = Math.round(perfScore * 100);
    const status: "pass" | "warn" | "fail" = percent >= 90 ? "pass" : percent >= 50 ? "warn" : "fail";
    checks.push({
      id: "cwv-lighthouse-score",
      category: "performance",
      name: "Score Lighthouse Performance",
      status,
      severity: status === "fail" ? "high" : status === "warn" ? "medium" : undefined,
      description: `Score performance Lighthouse : ${percent}/100 (cible : ≥ 90).`,
      value: `${percent}/100`,
      recommendation:
        status !== "pass"
          ? "Analysez le détail sur https://pagespeed.web.dev/ — focus sur LCP, TBT, render-blocking JavaScript."
          : undefined,
    });
  }

  // TTFB from PSI (authoritative)
  if (sr !== undefined) {
    const status = metricStatus(sr, 600, 1200);
    checks.push({
      id: "cwv-server-response",
      category: "performance",
      name: "Server Response Time (Lighthouse)",
      status,
      severity: severityForStatus(status),
      description: `Server Response Time mesuré par Lighthouse : ${Math.round(sr)} ms.`,
      value: `${Math.round(sr)} ms`,
    });
  }

  return checks;
}
