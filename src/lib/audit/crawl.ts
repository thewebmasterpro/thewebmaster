// Multi-page crawl: most audits only test the home page, missing issues on
// /login, /checkout, /admin, /api/*. We fetch sitemap.xml (fallback: heuristics),
// pick representative routes, and run a lightweight per-route audit —
// surfacing the WORST status found across routes for each header/cookie check.

import type { AuditCheck } from "@/types/audit";

async function safeFetchText(url: string, timeoutMs: number): Promise<{ headers: Headers; body: string; status: number } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "TheWebmaster-SecurityAudit/2.0", Accept: "text/html,application/xml" },
    });
    clearTimeout(timer);
    const body = await res.text();
    return { headers: res.headers, body, status: res.status };
  } catch {
    return null;
  }
}

async function safeFetchHeadersOnly(url: string, timeoutMs: number): Promise<{ headers: Headers; status: number } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      method: "GET",
      headers: { "User-Agent": "TheWebmaster-SecurityAudit/2.0", Accept: "text/html" },
    });
    clearTimeout(timer);
    return { headers: res.headers, status: res.status };
  } catch {
    return null;
  }
}

// Parse sitemap.xml (or sitemap index) and return a list of candidate URLs.
async function parseSitemap(origin: string): Promise<string[]> {
  const urls = new Set<string>();
  const sitemapCandidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap-index.xml`,
  ];

  for (const sm of sitemapCandidates) {
    const res = await safeFetchText(sm, 4000);
    if (!res || res.status !== 200) continue;
    if (!res.headers.get("content-type")?.includes("xml") && !res.body.trimStart().startsWith("<?xml")) continue;

    // Collect <loc>…</loc> URLs
    const locMatches = res.body.matchAll(/<loc\b[^>]*>([^<]+)<\/loc>/gi);
    for (const m of locMatches) {
      const u = m[1].trim();
      if (u.startsWith(origin)) urls.add(u);
      if (urls.size > 200) break;
    }
    if (urls.size > 0) break;
  }

  return [...urls];
}

// Pick N representative routes: home + login-like + checkout-like + api + sampled others.
function pickRepresentativeRoutes(origin: string, sitemapUrls: string[], maxRoutes = 5): string[] {
  const picked = new Set<string>();
  picked.add(origin + "/");

  const predicates: { re: RegExp; priority: number }[] = [
    { re: /\/(login|signin|sign-in|connexion|se-connecter|compte|account)\b/i, priority: 1 },
    { re: /\/(checkout|panier|cart|commande|commander|paiement)\b/i, priority: 2 },
    { re: /\/(admin|dashboard|console|manage)\b/i, priority: 3 },
    { re: /\/api\b/i, priority: 4 },
    { re: /\/(search|recherche)\b/i, priority: 5 },
    { re: /\/(contact|formulaire|form)\b/i, priority: 6 },
  ];

  // Sort sitemap URLs by predicate priority, pick first matches
  const seenPriorities = new Set<number>();
  for (const { re, priority } of predicates) {
    if (picked.size >= maxRoutes) break;
    if (seenPriorities.has(priority)) continue;
    const match = sitemapUrls.find((u) => re.test(u));
    if (match) {
      picked.add(match);
      seenPriorities.add(priority);
    }
  }

  // Fill remaining slots with sampled URLs from sitemap (evenly distributed)
  if (picked.size < maxRoutes && sitemapUrls.length > 0) {
    const step = Math.max(1, Math.floor(sitemapUrls.length / (maxRoutes - picked.size + 1)));
    for (let i = 0; i < sitemapUrls.length && picked.size < maxRoutes; i += step) {
      picked.add(sitemapUrls[i]);
    }
  }

  return [...picked];
}

// Heuristic fallback when sitemap is absent: probe common routes.
async function heuristicRoutes(origin: string): Promise<string[]> {
  const candidates = [
    "/",
    "/login", "/signin", "/connexion", "/compte",
    "/checkout", "/cart", "/panier",
    "/admin", "/dashboard",
    "/contact",
    "/search",
    "/api/",
  ];
  const results = await Promise.all(
    candidates.map(async (p) => {
      const res = await safeFetchHeadersOnly(origin + p, 2500);
      if (!res) return null;
      // Accept 200/301/302; skip 404/410
      if (res.status >= 200 && res.status < 400) return origin + p;
      return null;
    })
  );
  return results.filter((u): u is string => u !== null);
}

export async function discoverRoutes(baseUrl: string, maxRoutes = 5): Promise<string[]> {
  const origin = new URL(baseUrl).origin;
  const sitemapUrls = await parseSitemap(origin);
  if (sitemapUrls.length > 0) {
    return pickRepresentativeRoutes(origin, sitemapUrls, maxRoutes);
  }
  const fallback = await heuristicRoutes(origin);
  return fallback.slice(0, maxRoutes);
}

/**
 * Runs per-route header checks and returns aggregate findings across routes.
 * Each finding is surfaced ONCE with the worst status observed + the route that triggered it.
 */
export async function crawlAndAuditHeaders(routes: string[]): Promise<{
  routeHeaders: { route: string; headers: Headers; status: number }[];
  extraChecks: AuditCheck[];
}> {
  const results = await Promise.all(
    routes.map(async (route) => {
      const res = await safeFetchHeadersOnly(route, 5000);
      if (!res) return null;
      return { route, headers: res.headers, status: res.status };
    })
  );

  const routeHeaders = results.filter((r): r is { route: string; headers: Headers; status: number } => r !== null);

  const extraChecks: AuditCheck[] = [];

  // Inconsistent security headers across routes — sign of partial config
  const headerKeys = ["strict-transport-security", "content-security-policy", "x-frame-options", "x-content-type-options"];
  const inconsistencies: string[] = [];
  for (const key of headerKeys) {
    const presence = routeHeaders.map((r) => r.headers.has(key));
    const allPresent = presence.every(Boolean);
    const allAbsent = presence.every((p) => !p);
    if (!allPresent && !allAbsent) {
      const missingOn = routeHeaders.filter((r) => !r.headers.has(key)).map((r) => r.route);
      inconsistencies.push(`${key} manquant sur : ${missingOn.slice(0, 3).join(", ")}${missingOn.length > 3 ? "…" : ""}`);
    }
  }

  if (inconsistencies.length > 0) {
    extraChecks.push({
      id: "multi-page-header-inconsistency",
      category: "headers",
      name: "Headers de sécurité incohérents entre les routes",
      status: "warn",
      severity: "medium",
      description: `Certains en-têtes de sécurité ne sont pas appliqués uniformément sur toutes les routes auditées (${routeHeaders.length}). Un attaquant peut pivoter vers la route la moins protégée.`,
      value: inconsistencies.join(" | "),
      recommendation: "Centralisez les headers via middleware ou reverse-proxy, et testez l'ensemble des routes sensibles.",
    });
  }

  return { routeHeaders, extraChecks };
}
