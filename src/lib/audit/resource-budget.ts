// Resource budget analysis: counts and weighs the resources declared on the
// page (scripts, stylesheets, images, fonts), fetches their Content-Length
// via HEAD with concurrency limiting, and compares against Web Almanac /
// HTTP Archive median budgets. Far more actionable than "HTML is 300 Ko".

import type { AuditCheck } from "@/types/audit";
import { safeFetch, parallelLimit } from "./fetch";
import { stripScriptsAndStyles } from "./html-parse";

interface ResourceUrls {
  scripts: string[];
  stylesheets: string[];
  images: string[];
  fonts: string[];
}

function resolveUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export function extractResourceUrls(html: string, baseUrl: string): ResourceUrls {
  // Keep only the <head> for linked resources to avoid lazy-injected stuff
  const cleaned = stripScriptsAndStyles(html.replace(/<!--[\s\S]*?-->/g, ""));

  // Scripts with src (both blocking and async/defer)
  const scriptMatches = html.match(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi) || [];
  const scripts = scriptMatches
    .map((tag) => tag.match(/src\s*=\s*["']([^"']+)["']/i)?.[1])
    .filter((s): s is string => !!s)
    .map((s) => resolveUrl(s, baseUrl))
    .filter((s): s is string => !!s);

  // <link rel="stylesheet" href="…">
  const stylesheetMatches = cleaned.match(/<link\b[^>]*\brel\s*=\s*["']stylesheet["'][^>]*>/gi) || [];
  const stylesheets = stylesheetMatches
    .map((tag) => tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1])
    .filter((h): h is string => !!h)
    .map((h) => resolveUrl(h, baseUrl))
    .filter((h): h is string => !!h);

  // Images — only <img src> (skip srcset for the weight calc)
  const imgMatches = html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi) || [];
  const images = imgMatches
    .map((tag) => tag.match(/src\s*=\s*["']([^"']+)["']/i)?.[1])
    .filter((s): s is string => !!s && !s.startsWith("data:"))
    .map((s) => resolveUrl(s, baseUrl))
    .filter((s): s is string => !!s);

  // Fonts — <link rel="preload" as="font"> + @font-face src in <style>
  const fonts = new Set<string>();
  const preloadFonts = cleaned.match(/<link\b[^>]*\brel\s*=\s*["']preload["'][^>]*>/gi) || [];
  for (const tag of preloadFonts) {
    const asMatch = tag.match(/\bas\s*=\s*["']font["']/i);
    if (!asMatch) continue;
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) {
      const r = resolveUrl(href, baseUrl);
      if (r) fonts.add(r);
    }
  }
  // Inline @font-face URLs
  const inlineStyles = html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/gi) || [];
  for (const block of inlineStyles) {
    const urlMatches = block.match(/@font-face[\s\S]*?src\s*:\s*url\(["']?([^"')]+)/gi) || [];
    for (const m of urlMatches) {
      const u = m.match(/url\(["']?([^"')]+)/i)?.[1];
      if (u) {
        const r = resolveUrl(u, baseUrl);
        if (r) fonts.add(r);
      }
    }
  }

  return {
    scripts: [...new Set(scripts)],
    stylesheets: [...new Set(stylesheets)],
    images: [...new Set(images)].slice(0, 30), // cap to keep fetch budget reasonable
    fonts: [...fonts],
  };
}

async function fetchSize(url: string): Promise<number | null> {
  // Prefer HEAD; fallback to GET Range if server doesn't expose content-length
  const head = await safeFetch(url, { method: "HEAD", timeout: 4000, redirect: "follow" });
  if (head && head.ok) {
    const cl = parseInt(head.headers.get("content-length") || "0");
    if (cl > 0) return cl;
  }
  // Some CDNs strip content-length on HEAD; try GET
  const get = await safeFetch(url, { method: "GET", timeout: 5000, redirect: "follow" });
  if (get && get.ok) {
    const cl = parseInt(get.headers.get("content-length") || "0");
    if (cl > 0) return cl;
    try {
      const buf = await get.arrayBuffer();
      return buf.byteLength;
    } catch {
      return null;
    }
  }
  return null;
}

export interface BudgetReport {
  counts: { scripts: number; stylesheets: number; images: number; fonts: number };
  bytes: { scripts: number; stylesheets: number; images: number; fonts: number; total: number };
  checks: AuditCheck[];
}

// Thresholds sourced from 2024 Web Almanac 75th percentile (aggressive target)
// and 50th percentile (warn). These are the totals for a single page.
const THRESHOLDS = {
  scripts: { pass: 400_000, warn: 900_000 }, // bytes: ~400 KB / 900 KB
  stylesheets: { pass: 80_000, warn: 200_000 },
  images: { pass: 1_500_000, warn: 3_000_000 },
  fonts: { pass: 150_000, warn: 400_000 },
  total: { pass: 2_000_000, warn: 4_500_000 },
};

export async function checkResourceBudget(html: string, baseUrl: string): Promise<BudgetReport> {
  const urls = extractResourceUrls(html, baseUrl);
  const counts = {
    scripts: urls.scripts.length,
    stylesheets: urls.stylesheets.length,
    images: urls.images.length,
    fonts: urls.fonts.length,
  };

  // Fetch sizes in parallel with concurrency 6 (don't DDoS the target)
  const all = [
    ...urls.scripts.map((u) => ({ kind: "scripts" as const, url: u })),
    ...urls.stylesheets.map((u) => ({ kind: "stylesheets" as const, url: u })),
    ...urls.images.map((u) => ({ kind: "images" as const, url: u })),
    ...urls.fonts.map((u) => ({ kind: "fonts" as const, url: u })),
  ];

  const sizes = await parallelLimit(all, 6, async (item) => {
    const size = await fetchSize(item.url);
    return { kind: item.kind, size: size ?? 0 };
  });

  const bytes = { scripts: 0, stylesheets: 0, images: 0, fonts: 0, total: 0 };
  for (const s of sizes) {
    bytes[s.kind] += s.size;
    bytes.total += s.size;
  }

  const checks: AuditCheck[] = [];

  function pushBudgetCheck(kind: keyof typeof THRESHOLDS, label: string, weightKb: number): void {
    const { pass, warn } = THRESHOLDS[kind];
    const bytesForKind = kind === "total" ? bytes.total : bytes[kind];
    let status: AuditCheck["status"] = "pass";
    let severity: AuditCheck["severity"];
    if (bytesForKind > warn) {
      status = "fail";
      severity = kind === "total" ? "high" : "medium";
    } else if (bytesForKind > pass) {
      status = "warn";
      severity = "low";
    }
    if (bytesForKind === 0) {
      // No resources measured — skip the check (likely a static page or blocked fetch)
      return;
    }
    const kb = Math.round(bytesForKind / 1024);
    checks.push({
      id: `perf-budget-${kind}`,
      category: "resources",
      name: `Budget ${label}`,
      status,
      severity,
      description: `${kb} Ko ${weightKb > 0 ? `(${counts[kind as keyof typeof counts] ?? ""} fichier${(counts[kind as keyof typeof counts] ?? 0) > 1 ? "s" : ""})` : ""}. Budget recommandé : < ${Math.round(pass / 1024)} Ko bon, > ${Math.round(warn / 1024)} Ko critique.`,
      value: `${kb} Ko`,
      recommendation:
        status === "fail"
          ? budgetRemediation(kind)
          : status === "warn"
            ? "Optimisez ce budget (minification, tree-shaking, compression moderne, splitting)."
            : undefined,
    });
  }

  pushBudgetCheck("scripts", "JavaScript", bytes.scripts);
  pushBudgetCheck("stylesheets", "CSS", bytes.stylesheets);
  pushBudgetCheck("images", "images", bytes.images);
  if (urls.fonts.length > 0) pushBudgetCheck("fonts", "fontes", bytes.fonts);
  pushBudgetCheck("total", "ressources (total)", bytes.total);

  // Count-based sanity check: too many separate resources hurts HTTP/1.1,
  // still affects HTTP/2 due to compile overhead on scripts
  if (counts.scripts > 25) {
    checks.push({
      id: "perf-script-count",
      category: "resources",
      name: "Nombre de scripts",
      status: "warn",
      severity: "low",
      description: `${counts.scripts} scripts externes. Au-delà de 25, le coût de parsing/compilation JavaScript devient notable.`,
      value: `${counts.scripts} scripts`,
      recommendation: "Regroupez les scripts (code splitting intelligent), retirez les bundles inutilisés.",
    });
  }

  return { counts, bytes, checks };
}

function budgetRemediation(kind: keyof typeof THRESHOLDS): string {
  switch (kind) {
    case "scripts":
      return "Réduisez le JavaScript : tree-shaking, dynamic imports, retirez les polyfills obsolètes. Sur Next.js : `next build --profile` puis analyser avec `@next/bundle-analyzer`.";
    case "stylesheets":
      return "CSS en trop : retirez les règles non utilisées (PurgeCSS / Tailwind JIT), inlinez le critical CSS, lazy-load le reste.";
    case "images":
      return "Servez en WebP/AVIF, redimensionnez côté serveur (next/image, Cloudflare Images), lazy-load les images below-the-fold.";
    case "fonts":
      return "Limitez à 2-3 variantes, subsettez les caractères latins, utilisez `font-display: swap`, préchargez la fonte critique.";
    case "total":
      return "Le poids total dépasse le budget perf. Priorisez : moins de scripts tiers, images modernes, CSS tree-shaked, fontes subsettées.";
  }
}
