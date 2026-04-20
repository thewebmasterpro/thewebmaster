// Shared HTTP helpers for all audit modules. Replaces 3 duplicate safeFetch
// implementations (route.ts, hreflang.ts, sitemap.ts) and adds a concurrency
// limiter so broad crawls (link checking, hreflang graph) don't flood targets.

const DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; TheWebmaster-Audit/2.0; +https://thewebmaster.pro)";

export interface FetchOptions extends Omit<RequestInit, "signal"> {
  timeout?: number;
  userAgent?: string;
}

/**
 * Fetches a URL with a hard timeout. Returns null on any error — callers
 * handle the absence of data rather than try/catching everywhere.
 */
export async function safeFetch(url: string, options: FetchOptions = {}): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout || 8000);
    const baseHeaders: Record<string, string> = { "User-Agent": options.userAgent || DEFAULT_USER_AGENT };
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { ...baseHeaders, ...(options.headers as Record<string, string>) },
    });
    clearTimeout(timer);
    return res;
  } catch {
    return null;
  }
}

export async function safeFetchText(url: string, options: FetchOptions = {}): Promise<string | null> {
  const res = await safeFetch(url, options);
  if (!res || !res.ok) return null;
  try {
    return await res.text();
  } catch {
    return null;
  }
}

export async function safeFetchJson<T = unknown>(url: string, options: FetchOptions = {}): Promise<T | null> {
  const res = await safeFetch(url, {
    ...options,
    headers: { Accept: "application/json", ...(options.headers as Record<string, string>) },
  });
  if (!res || !res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Runs async tasks with a concurrency limit — avoids overwhelming a single
 * origin with hundreds of parallel requests during link-check or hreflang
 * graph traversal.
 */
/**
 * Normalises a URL for semantic comparison. Two URLs are considered equivalent
 * when their normalised forms match — even if they differ in:
 *  - protocol (http ↔ https)
 *  - leading www
 *  - hostname case
 *  - port (443/80 stripped)
 *  - trailing slash
 *  - fragment
 *  - tracking query params (utm_*, fbclid, gclid, mc_*, _hsenc, …)
 *
 * Used for canonical self-reference checks where the page URL might be
 * https://example.com/ and the canonical https://www.example.com/#anchor.
 */
export function normaliseUrlForComparison(urlLike: string, base?: string): string | null {
  try {
    const u = new URL(urlLike, base);
    // Lowercase hostname, strip leading www
    let host = u.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.substring(4);
    // Strip default port
    const isDefaultPort =
      (u.protocol === "https:" && (u.port === "" || u.port === "443")) ||
      (u.protocol === "http:" && (u.port === "" || u.port === "80"));
    const port = isDefaultPort ? "" : `:${u.port}`;
    // Normalise path (remove trailing slash except for root)
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    // Strip tracking params
    const cleanedParams = new URLSearchParams();
    const trackingRegex = /^(?:utm_|fbclid|gclid|mc_|_hsenc|_hsmi|mkt_tok|ref_src|ref_url|yclid|dclid|msclkid|oly_enc_id|oly_anon_id|hsCtaTracking|wickedid|elqTrack|elqTrackId)/i;
    for (const [k, v] of u.searchParams) {
      if (!trackingRegex.test(k)) cleanedParams.append(k, v);
    }
    const query = cleanedParams.toString();
    // Strip the protocol difference for comparison (http ↔ https both OK)
    return `//${host}${port}${path}${query ? "?" + query : ""}`;
  } catch {
    return null;
  }
}

/**
 * Strict-equality comparison of two URLs under normalisation. Returns true
 * when both URLs point to the same logical resource.
 */
export function sameLogicalUrl(a: string, b: string, base?: string): boolean {
  const na = normaliseUrlForComparison(a, base);
  const nb = normaliseUrlForComparison(b, base);
  return na !== null && nb !== null && na === nb;
}

export async function parallelLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function runOne(): Promise<void> {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runOne());
  await Promise.all(workers);
  return results;
}
