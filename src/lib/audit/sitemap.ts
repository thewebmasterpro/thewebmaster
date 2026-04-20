// Sitemap parser + analyzer. Goes beyond "200 OK" — verifies content-type,
// parses XML structure (URLs, lastmod, sitemap indexes), detects stale
// sitemaps (> 6 months since last update) and oversized ones (> 50 000 URLs).

import type { AuditCheck } from "@/types/audit";
import { safeFetch } from "./fetch";

interface SitemapFetch {
  url: string;
  status: number;
  contentType: string;
  body: string;
}

async function fetchSitemap(url: string, timeoutMs = 6000): Promise<SitemapFetch | null> {
  const res = await safeFetch(url, {
    timeout: timeoutMs,
    redirect: "follow",
    headers: { Accept: "application/xml,text/xml,*/*" },
  });
  if (!res || !res.ok) return null;
  try {
    const contentType = res.headers.get("content-type") || "";
    const body = await res.text();
    return { url, status: res.status, contentType, body };
  } catch {
    return null;
  }
}

export interface ParsedSitemap {
  kind: "sitemap" | "index";
  urls: { loc: string; lastmod?: string }[];
  childSitemaps: string[];
  totalCount: number;
}

export function parseSitemapXml(xml: string): ParsedSitemap | null {
  const trimmed = xml.trimStart();
  if (!trimmed.startsWith("<?xml") && !trimmed.startsWith("<urlset") && !trimmed.startsWith("<sitemapindex")) {
    return null;
  }
  // Sitemap index: <sitemapindex>…<sitemap><loc>...</loc></sitemap>…
  if (/<sitemapindex\b/i.test(trimmed)) {
    const matches = [...trimmed.matchAll(/<sitemap\b[\s\S]*?<loc>([^<]+)<\/loc>([\s\S]*?)<\/sitemap>/gi)];
    const childSitemaps = matches.map((m) => m[1].trim());
    return { kind: "index", urls: [], childSitemaps, totalCount: childSitemaps.length };
  }
  // Regular urlset
  if (/<urlset\b/i.test(trimmed)) {
    const urlMatches = [...trimmed.matchAll(/<url\b[\s\S]*?<loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/gi)];
    const urls = urlMatches.map((m) => {
      const loc = m[1].trim();
      const lastmodMatch = m[2].match(/<lastmod>([^<]+)<\/lastmod>/i);
      return { loc, lastmod: lastmodMatch?.[1].trim() };
    });
    return { kind: "sitemap", urls, childSitemaps: [], totalCount: urls.length };
  }
  return null;
}

export async function checkSitemap(origin: string): Promise<AuditCheck[]> {
  const candidates = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/sitemap-index.xml`];
  let fetched: SitemapFetch | null = null;
  for (const c of candidates) {
    fetched = await fetchSitemap(c);
    if (fetched) break;
  }

  if (!fetched) {
    return [
      {
        id: "sitemap-absent",
        category: "technical",
        name: "Sitemap XML",
        status: "fail",
        severity: "high",
        description: "Aucun sitemap.xml accessible. Indispensable pour une indexation efficace.",
        recommendation: "Générez un sitemap.xml et soumettez-le via Google Search Console. Sur Next.js : `app/sitemap.ts` fait le boulot.",
      },
    ];
  }

  const checks: AuditCheck[] = [];
  const { url, contentType, body } = fetched;

  // Content-type sanity: should be XML. HTML → soft 404 served as sitemap
  const looksLikeHtml = /text\/html/i.test(contentType) || /^<!doctype html|<html/i.test(body.trim());
  if (looksLikeHtml) {
    checks.push({
      id: "sitemap-soft-404",
      category: "technical",
      name: "Sitemap soft 404",
      status: "fail",
      severity: "high",
      description: `${url} renvoie HTTP 200 mais c'est une page HTML (probable 404 déguisée). Google ne la traitera pas comme un sitemap.`,
      value: url,
      recommendation: "Supprimez la route catch-all ou retournez un vrai 404 sur /sitemap.xml si le fichier n'existe pas.",
    });
    return checks;
  }

  const parsed = parseSitemapXml(body);
  if (!parsed) {
    checks.push({
      id: "sitemap-invalid-xml",
      category: "technical",
      name: "Sitemap XML invalide",
      status: "fail",
      severity: "high",
      description: "Le fichier sitemap est accessible mais n'est pas du XML Sitemap valide (urlset/sitemapindex manquant).",
      value: url,
      recommendation: "Vérifiez la structure via https://www.xml-sitemaps.com/validate-xml-sitemap.html",
    });
    return checks;
  }

  // Sitemap index: walk one level down
  if (parsed.kind === "index") {
    checks.push({
      id: "sitemap-index",
      category: "technical",
      name: "Sitemap index détecté",
      status: "pass",
      description: `${parsed.childSitemaps.length} sitemap(s) enfant(s) référencés.`,
      value: url,
    });
    // Sample-check the first child for freshness
    const first = parsed.childSitemaps[0];
    if (first) {
      const child = await fetchSitemap(first);
      if (child) {
        const childParsed = parseSitemapXml(child.body);
        if (childParsed?.kind === "sitemap") {
          pushFreshnessCheck(checks, childParsed, first);
          pushSizeCheck(checks, childParsed, first);
        }
      }
    }
    return checks;
  }

  // Regular sitemap
  checks.push({
    id: "sitemap-valid",
    category: "technical",
    name: "Sitemap XML valide",
    status: "pass",
    description: `Sitemap valide avec ${parsed.urls.length} URL(s).`,
    value: url,
  });
  pushFreshnessCheck(checks, parsed, url);
  pushSizeCheck(checks, parsed, url);

  return checks;
}

function pushFreshnessCheck(checks: AuditCheck[], parsed: ParsedSitemap, url: string): void {
  const lastmods = parsed.urls
    .map((u) => u.lastmod)
    .filter((m): m is string => !!m)
    .map((m) => new Date(m).getTime())
    .filter((t) => !Number.isNaN(t));
  if (lastmods.length === 0) {
    checks.push({
      id: "sitemap-no-lastmod",
      category: "technical",
      name: "Sitemap sans <lastmod>",
      status: "info",
      description: "Aucune date <lastmod> dans le sitemap. Google utilise son propre cache pour estimer la fraîcheur.",
      value: url,
      recommendation: "Ajoutez <lastmod>2025-04-18</lastmod> sur chaque <url> pour aider le crawler à prioriser.",
    });
    return;
  }
  const newest = Math.max(...lastmods);
  const daysSinceNewest = Math.floor((Date.now() - newest) / 86400000);
  if (daysSinceNewest > 180) {
    checks.push({
      id: "sitemap-stale",
      category: "technical",
      name: "Sitemap obsolète",
      status: "warn",
      severity: "medium",
      description: `La date <lastmod> la plus récente remonte à ${daysSinceNewest} jours. Google peut cesser de re-crawler régulièrement les URLs listées.`,
      value: `Dernière mise à jour : ${new Date(newest).toISOString().split("T")[0]}`,
      recommendation: "Régénérez votre sitemap à chaque modification de contenu, pas au déploiement.",
    });
  }
}

function pushSizeCheck(checks: AuditCheck[], parsed: ParsedSitemap, url: string): void {
  if (parsed.urls.length > 50000) {
    checks.push({
      id: "sitemap-oversized",
      category: "technical",
      name: "Sitemap trop volumineux",
      status: "fail",
      severity: "medium",
      description: `${parsed.urls.length} URLs dans un seul fichier. La limite Google est de 50 000 URLs ou 50 Mo par sitemap.`,
      value: url,
      recommendation: "Divisez en plusieurs sitemaps thématiques et référencez-les via un sitemap index.",
    });
  }
}
