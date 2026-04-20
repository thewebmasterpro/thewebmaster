// Critical rendering path analysis: identifies render-blocking CSS & JS,
// preload/preconnect hygiene, and request chain depth. Unlike the old tool
// which did a raw regex count, we distinguish between:
//  - blocking JS (no async/defer, not type=module)
//  - non-blocking JS (async/defer/module)
//  - synchronous CSS vs media-matched / preload-with-onload
//  - fonts with correct preload + crossorigin

import type { AuditCheck } from "@/types/audit";
import { stripScriptsAndStyles, parseLinkTags, getLinksByRel } from "./html-parse";

export interface CriticalPathReport {
  blockingScripts: { src: string; inHead: boolean }[];
  blockingStylesheets: { href: string; media: string | null }[];
  asyncScripts: number;
  deferScripts: number;
  moduleScripts: number;
  preconnects: string[];
  preloads: { href: string; as: string | null }[];
  checks: AuditCheck[];
}

function splitHeadBody(html: string): { head: string; body: string } {
  const headMatch = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  if (!headMatch) return { head: html.substring(0, 4000), body: html };
  const head = headMatch[1];
  const body = html.substring((headMatch.index || 0) + headMatch[0].length);
  return { head, body };
}

export function analyzeCriticalPath(html: string): CriticalPathReport {
  const { head } = splitHeadBody(html);
  const checks: AuditCheck[] = [];

  // Render-blocking scripts in <head>
  const scriptRegex = /<script\b([^>]*)>/gi;
  const blockingScripts: { src: string; inHead: boolean }[] = [];
  let asyncScripts = 0;
  let deferScripts = 0;
  let moduleScripts = 0;

  // Scan HEAD specifically for render-blocking scripts
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(head)) !== null) {
    const attrs = match[1];
    const src = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src) continue;
    const isAsync = /\basync\b/i.test(attrs);
    const isDefer = /\bdefer\b/i.test(attrs);
    const isModule = /\btype\s*=\s*["']module["']/i.test(attrs);
    if (isModule) moduleScripts++;
    else if (isAsync) asyncScripts++;
    else if (isDefer) deferScripts++;
    else blockingScripts.push({ src, inHead: true });
  }

  // Stylesheets — render-blocking unless media="print" or media="(max-width: 0)"
  const cleaned = stripScriptsAndStyles(head.replace(/<!--[\s\S]*?-->/g, ""));
  const linkRegex = /<link\b([^>]*)\/?>/gi;
  const blockingStylesheets: { href: string; media: string | null }[] = [];
  const preloads: { href: string; as: string | null }[] = [];
  const preconnects: string[] = [];

  while ((match = linkRegex.exec(cleaned)) !== null) {
    const attrs = match[1];
    const rel = attrs.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!rel || !href) continue;
    const media = attrs.match(/\bmedia\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
    const as = attrs.match(/\bas\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;

    if (rel === "stylesheet") {
      // Non-blocking if media matches none of the current viewports OR has onload trick
      const isPrintOnly = media === "print";
      const hasOnloadTrick = /\bonload\s*=\s*["'][^"']*this\.rel\s*=\s*["']stylesheet["']/i.test(attrs);
      if (!isPrintOnly && !hasOnloadTrick) {
        blockingStylesheets.push({ href, media });
      }
    } else if (rel === "preload") {
      preloads.push({ href, as });
    } else if (rel === "preconnect" || rel === "dns-prefetch") {
      preconnects.push(href);
    }
  }

  // Render-blocking scripts check
  if (blockingScripts.length > 3) {
    checks.push({
      id: "perf-blocking-scripts",
      category: "rendering",
      name: "Scripts render-blocking dans <head>",
      status: "fail",
      severity: "high",
      description: `${blockingScripts.length} script(s) chargé(s) de façon synchrone dans <head>. Chacun retarde le first paint.`,
      value: blockingScripts.slice(0, 3).map((s) => s.src).join(" | "),
      recommendation: "Ajoutez async ou defer, ou déplacez les scripts en fin de <body>. Pour les scripts type=\"module\", c'est defer par défaut.",
    });
  } else if (blockingScripts.length > 0) {
    checks.push({
      id: "perf-blocking-scripts",
      category: "rendering",
      name: "Scripts render-blocking dans <head>",
      status: "warn",
      severity: "medium",
      description: `${blockingScripts.length} script(s) synchrone(s) dans <head>.`,
      value: blockingScripts.map((s) => s.src).join(" | "),
      recommendation: "Ajoutez async ou defer pour libérer le main thread pendant le chargement.",
    });
  } else {
    checks.push({
      id: "perf-blocking-scripts",
      category: "rendering",
      name: "Scripts render-blocking",
      status: "pass",
      description: `Aucun script bloquant dans <head>. ${asyncScripts + deferScripts + moduleScripts} scripts non-bloquants détectés.`,
    });
  }

  // Render-blocking CSS check
  if (blockingStylesheets.length > 4) {
    checks.push({
      id: "perf-blocking-css",
      category: "rendering",
      name: "CSS render-blocking",
      status: "fail",
      severity: "high",
      description: `${blockingStylesheets.length} feuilles de style bloquent le rendu. Chaque CSS en plus ajoute un aller-retour réseau avant le first paint.`,
      value: blockingStylesheets.slice(0, 3).map((s) => s.href).join(" | "),
      recommendation: "Inlinez le critical CSS (< 14 Ko), chargez le reste en preload + onload (pattern FOUC-safe), supprimez les frameworks CSS non utilisés.",
    });
  } else if (blockingStylesheets.length > 2) {
    checks.push({
      id: "perf-blocking-css",
      category: "rendering",
      name: "CSS render-blocking",
      status: "warn",
      severity: "medium",
      description: `${blockingStylesheets.length} feuille(s) de style bloquante(s).`,
      recommendation: "Regroupez en 1-2 bundles et inlinez le critical CSS.",
    });
  }

  // Preconnect hygiene — warn if > 5 preconnects (each opens a TCP connection)
  if (preconnects.length > 6) {
    checks.push({
      id: "perf-too-many-preconnects",
      category: "rendering",
      name: "Trop de preconnect",
      status: "warn",
      severity: "low",
      description: `${preconnects.length} preconnect/dns-prefetch déclarés. Chacun consomme une connexion TCP — limitez-les aux 3-4 domaines les plus critiques.`,
      value: preconnects.slice(0, 4).join(", "),
    });
  }

  // Missing crossorigin on font preload
  const fontPreloadsMissingCors = preloads.filter((p) => p.as === "font");
  if (fontPreloadsMissingCors.length > 0) {
    // Check original tags to see if crossorigin is present
    const fontPreloadsInHtml =
      html.match(/<link\b[^>]*\brel\s*=\s*["']preload["'][^>]*\bas\s*=\s*["']font["'][^>]*>/gi) ||
      [];
    const withoutCors = fontPreloadsInHtml.filter((tag) => !/\bcrossorigin\b/i.test(tag));
    if (withoutCors.length > 0) {
      checks.push({
        id: "perf-font-preload-cors",
        category: "rendering",
        name: "Font preload sans crossorigin",
        status: "warn",
        severity: "medium",
        description: `${withoutCors.length} <link rel="preload" as="font"> sans l'attribut crossorigin. Le navigateur téléchargera la fonte deux fois (preload anonyme + requête CORS réelle).`,
        recommendation: `Ajoutez crossorigin="anonymous" : <link rel="preload" as="font" type="font/woff2" href="…" crossorigin>.`,
      });
    }
  }

  // No preconnect to critical third-party domains
  const links = parseLinkTags(html);
  const preconnectedHosts = getLinksByRel(links, "preconnect")
    .concat(getLinksByRel(links, "dns-prefetch"))
    .map((l) => {
      try {
        return new URL(l.href).hostname;
      } catch {
        return null;
      }
    })
    .filter((h): h is string => !!h);

  const criticalThirdParties = ["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net", "unpkg.com"];
  const usesCriticalThirdParty = criticalThirdParties.some((host) => html.includes(host));
  const missingPreconnect = criticalThirdParties.filter((host) =>
    html.includes(host) && !preconnectedHosts.includes(host)
  );
  if (usesCriticalThirdParty && missingPreconnect.length > 0) {
    checks.push({
      id: "perf-missing-preconnect",
      category: "rendering",
      name: "Preconnect manquant sur tiers critiques",
      status: "warn",
      severity: "low",
      description: `Ressources de ${missingPreconnect.join(", ")} utilisées mais aucun preconnect. Le DNS + TCP + TLS se fait après le first paint.`,
      recommendation: missingPreconnect.map((h) => `<link rel="preconnect" href="https://${h}" crossorigin>`).join("\n"),
    });
  }

  return { blockingScripts, blockingStylesheets, asyncScripts, deferScripts, moduleScripts, preconnects, preloads, checks };
}
