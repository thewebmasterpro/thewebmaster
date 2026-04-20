// Broken link detection: takes the internal anchors from the rendered HTML
// (and optionally from multi-page crawl), deduplicates, HEAD-checks them with
// concurrency limit, reports 4xx/5xx/timeouts.
//
// Why HEAD and not GET: head the server doesn't return a body → faster, less
// bandwidth, same status code. Fallback to GET if HEAD returns 405/501.

import type { AuditCheck } from "@/types/audit";
import { safeFetch, parallelLimit } from "./fetch";
import { parseAnchorTags, categorizeLinks, type AnchorTag } from "./html-parse";

type Anchor = AnchorTag;

export interface BrokenLinkResult {
  url: string;
  status: number | "timeout" | "error";
  fromText: string;
}

async function checkLink(url: string): Promise<BrokenLinkResult["status"]> {
  const head = await safeFetch(url, { method: "HEAD", timeout: 5000, redirect: "follow" });
  if (!head) return "timeout";
  if (head.status === 405 || head.status === 501) {
    // HEAD not supported — fallback to GET
    const get = await safeFetch(url, { method: "GET", timeout: 6000, redirect: "follow" });
    if (!get) return "timeout";
    return get.status;
  }
  return head.status;
}

export async function checkBrokenLinks(
  html: string,
  baseUrl: string,
  maxLinks = 40
): Promise<{ checks: AuditCheck[]; broken: BrokenLinkResult[] }> {
  const anchors = parseAnchorTags(html);
  const { internal } = categorizeLinks(anchors, baseUrl);

  // Deduplicate by absolute URL
  const seen = new Set<string>();
  const unique: Anchor[] = [];
  for (const a of internal) {
    try {
      const abs = new URL(a.href, baseUrl).toString();
      if (seen.has(abs)) continue;
      seen.add(abs);
      unique.push({ ...a, href: abs });
    } catch {}
  }

  if (unique.length === 0) {
    return { checks: [], broken: [] };
  }

  const toCheck = unique.slice(0, maxLinks);
  const results = await parallelLimit(toCheck, 8, async (anchor) => {
    const status = await checkLink(anchor.href);
    return { url: anchor.href, status, fromText: anchor.text.slice(0, 60) };
  });

  const broken = results.filter((r) => {
    if (r.status === "timeout" || r.status === "error") return true;
    if (typeof r.status === "number") return r.status >= 400 && r.status !== 429; // ignore throttling
    return false;
  });

  const checks: AuditCheck[] = [];
  if (broken.length > 0) {
    const ratio = broken.length / toCheck.length;
    const severity: "critical" | "high" | "medium" =
      ratio > 0.2 ? "high" : ratio > 0.05 ? "medium" : "medium";
    const status = ratio > 0.1 ? "fail" : "warn";
    checks.push({
      id: "onpage-broken-links",
      category: "onpage",
      name: "Liens internes cassés",
      status,
      severity,
      description: `${broken.length}/${toCheck.length} liens internes retournent une erreur (4xx/5xx/timeout).${toCheck.length < unique.length ? ` (${unique.length - toCheck.length} liens additionnels non testés pour rester rapide.)` : ""}`,
      value: broken
        .slice(0, 5)
        .map((b) => `${b.url} → ${b.status}`)
        .join(" | "),
      recommendation:
        "Corrigez les liens cassés ou ajoutez des redirections 301 vers les URLs actuelles. Les liens 4xx gaspillent du budget crawl et dégradent l'UX.",
    });
  } else {
    checks.push({
      id: "onpage-broken-links",
      category: "onpage",
      name: "Liens internes cassés",
      status: "pass",
      description: `Aucun lien cassé parmi les ${toCheck.length} liens internes testés.`,
    });
  }

  return { checks, broken };
}
