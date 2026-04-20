// Fetches the latest stable version of each CMS at runtime, cached for 24 h
// in-process. Replaces hardcoded KNOWN_LATEST_VERSIONS so the audit stays
// accurate without requiring a code release.

interface CachedVersion {
  version: string;
  fetchedAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const versionCache = new Map<string, CachedVersion>();

async function safeFetchJson<T>(url: string, timeoutMs = 5000): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "TheWebmaster-SecurityAudit/2.0" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function safeFetchText(url: string, timeoutMs = 5000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "TheWebmaster-SecurityAudit/2.0" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function getCached(key: string): string | null {
  const entry = versionCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    versionCache.delete(key);
    return null;
  }
  return entry.version;
}

function setCached(key: string, version: string): void {
  versionCache.set(key, { version, fetchedAt: Date.now() });
}

// Fallback values — used when the live API is unreachable. Kept in sync
// roughly; the live API query takes priority.
const FALLBACK_VERSIONS: Record<string, string> = {
  WordPress: "6.8",
  Joomla: "5.3",
  Drupal: "11.2",
  PrestaShop: "9.0",
  Magento: "2.4.7",
  TYPO3: "13.4",
};

async function fetchWordPressVersion(): Promise<string | null> {
  type WpVersionCheck = {
    offers?: { version?: string; response?: string }[];
  };
  const data = await safeFetchJson<WpVersionCheck>(
    "https://api.wordpress.org/core/version-check/1.7/"
  );
  if (!data?.offers?.length) return null;
  // First offer is the latest stable
  const latest = data.offers.find((o) => o.response === "upgrade") ?? data.offers[0];
  return latest?.version ?? null;
}

async function fetchDrupalVersion(): Promise<string | null> {
  // Drupal's update system: https://updates.drupal.org/release-history/drupal/current
  // Returns XML; we scrape the <supported_majors> or <version>
  const xml = await safeFetchText(
    "https://updates.drupal.org/release-history/drupal/current"
  );
  if (!xml) return null;
  // First <release><version>X.Y.Z</version> block is the latest
  const match = xml.match(/<release>[\s\S]*?<version>([\d.]+)<\/version>/);
  return match?.[1] ?? null;
}

async function fetchJoomlaVersion(): Promise<string | null> {
  // Joomla update: https://update.joomla.org/core/list.xml → XML with <update><version>
  const xml = await safeFetchText("https://update.joomla.org/core/list.xml");
  if (!xml) return null;
  // The "latest" entry is the one in the most recent update group. We take the max.
  const versions = [...xml.matchAll(/<version>([\d.]+)<\/version>/g)].map((m) => m[1]);
  if (versions.length === 0) return null;
  versions.sort((a, b) => {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const da = pa[i] ?? 0;
      const db = pb[i] ?? 0;
      if (da !== db) return db - da;
    }
    return 0;
  });
  return versions[0];
}

/**
 * Returns the latest known version for a CMS, queried live with a 24 h cache.
 * Falls back to the static table if the upstream endpoint is unreachable.
 */
export async function getLatestVersion(cms: string): Promise<string> {
  const cached = getCached(cms);
  if (cached) return cached;

  let live: string | null = null;
  try {
    if (cms === "WordPress") live = await fetchWordPressVersion();
    else if (cms === "Drupal") live = await fetchDrupalVersion();
    else if (cms === "Joomla") live = await fetchJoomlaVersion();
  } catch {
    // Network error → fall back
  }

  const version = live ?? FALLBACK_VERSIONS[cms] ?? "unknown";
  if (live) setCached(cms, live);
  return version;
}

/**
 * Pre-fetches all supported CMS versions in parallel. Returns a dict ready
 * to use for the audit run. Keep this behind a Promise.all at the top of the
 * main handler so we don't block individual checks.
 */
export async function preloadLatestVersions(): Promise<Record<string, string>> {
  const names = ["WordPress", "Joomla", "Drupal", "PrestaShop", "Magento", "TYPO3"];
  const results = await Promise.all(names.map(async (n) => [n, await getLatestVersion(n)] as const));
  return Object.fromEntries(results);
}
