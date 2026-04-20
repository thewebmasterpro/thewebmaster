// Hreflang validator: verifies ISO language codes, self-hreflang presence,
// and reciprocity with linked alternate URLs. Self + reciprocity are the
// most common mistakes (even big sites miss one or the other).

import type { AuditCheck } from "@/types/audit";
import { parseLinkTags, getLinksByRel } from "./html-parse";
import { safeFetchText, parallelLimit } from "./fetch";

const ISO_LANG_REGEX = /^(?:x-default|[a-z]{2,3}(?:-[A-Z]{2})?)$/;

export async function validateHreflang(currentUrl: string, html: string): Promise<AuditCheck[]> {
  const links = parseLinkTags(html);
  const alternates = getLinksByRel(links, "alternate").filter((l) => l.hreflang);

  if (alternates.length === 0) {
    return [
      {
        id: "hreflang-absent",
        category: "technical",
        name: "Hreflang international",
        status: "info",
        description: "Aucune balise hreflang détectée. Non-applicable pour un site mono-langue.",
        recommendation: "Si votre site vise plusieurs pays/langues, ajoutez des balises <link rel=\"alternate\" hreflang=\"fr-FR\" href=\"…\"> incluant une balise x-default.",
      },
    ];
  }

  const checks: AuditCheck[] = [];

  // Invalid ISO codes
  const invalidCodes = alternates
    .map((l) => l.hreflang!)
    .filter((code) => !ISO_LANG_REGEX.test(code));
  if (invalidCodes.length > 0) {
    checks.push({
      id: "hreflang-invalid-code",
      category: "technical",
      name: "Codes hreflang invalides",
      status: "fail",
      severity: "medium",
      description: `${invalidCodes.length} code(s) hreflang ne respectent pas le format ISO 639-1 / ISO 3166-1. Google ignorera ces annotations.`,
      value: invalidCodes.slice(0, 5).join(", "),
      recommendation: "Utilisez des codes conformes : `en`, `fr`, `en-US`, `pt-BR`, ou la valeur spéciale `x-default`.",
    });
  }

  // Missing self-hreflang: the current page's URL should be present in its own alternate list
  let currentPathname = "/";
  try {
    currentPathname = new URL(currentUrl).pathname || "/";
  } catch {}
  const selfListed = alternates.some((l) => {
    try {
      const target = new URL(l.href, currentUrl);
      return target.pathname === currentPathname || target.href === currentUrl;
    } catch {
      return false;
    }
  });
  if (!selfListed) {
    checks.push({
      id: "hreflang-no-self",
      category: "technical",
      name: "Self-hreflang manquant",
      status: "warn",
      severity: "low",
      description: "La page courante n'est pas listée dans ses propres balises hreflang. Google le considère comme une erreur bénigne mais officielle.",
      recommendation: `Ajoutez une balise hreflang pointant vers la page courante, ex : <link rel="alternate" hreflang="fr-FR" href="${currentUrl}">`,
    });
  }

  // Missing x-default — recommended for multi-region sites
  const hasXDefault = alternates.some((l) => l.hreflang === "x-default");
  if (!hasXDefault) {
    checks.push({
      id: "hreflang-no-xdefault",
      category: "technical",
      name: "Hreflang x-default manquant",
      status: "info",
      description: "Aucune balise `hreflang=\"x-default\"` détectée. Recommandée pour indiquer la version par défaut quand aucune langue ne correspond.",
      recommendation: `Ajoutez: <link rel="alternate" hreflang="x-default" href="${currentUrl}">`,
    });
  }

  // Reciprocity: fetch each alternate and verify it points back to us.
  // We check ALL alternates (cap at 50 to stay within a 60 s budget) with
  // concurrency limiting to avoid flooding the target.
  const alternatesToCheck = alternates
    .filter((l) => {
      try {
        const target = new URL(l.href, currentUrl);
        return target.href !== currentUrl;
      } catch {
        return false;
      }
    })
    .slice(0, 50);

  const reciprocityResults = await parallelLimit(
    alternatesToCheck,
    6,
    async (alt) => {
      let altUrl: string;
      try {
        altUrl = new URL(alt.href, currentUrl).toString();
      } catch {
        return null;
      }
      const altHtml = await safeFetchText(altUrl, { timeout: 4000, redirect: "follow" });
      if (!altHtml) return null;
      const altLinks = parseLinkTags(altHtml);
      const altAlternates = getLinksByRel(altLinks, "alternate").filter((l) => l.hreflang);
      const pointsBack = altAlternates.some((l) => {
        try {
          return new URL(l.href, altUrl).toString() === currentUrl;
        } catch {
          return false;
        }
      });
      // Cycle detection: does any alternate declared on altUrl point back to a
      // page that itself doesn't include altUrl as an alternate? We report a
      // simplified form: altUrl ↔ currentUrl asymmetric with other-direction node.
      const cycleTarget = altAlternates.find((l) => {
        try {
          const target = new URL(l.href, altUrl).toString();
          return target !== currentUrl && !alternates.some((a) => {
            try { return new URL(a.href, currentUrl).toString() === target; } catch { return false; }
          });
        } catch {
          return false;
        }
      });
      return {
        alt: alt.href,
        lang: alt.hreflang!,
        altUrl,
        pointsBack,
        cycleDetected: !!cycleTarget,
        cycleTarget: cycleTarget ? new URL(cycleTarget.href, altUrl).toString() : undefined,
      };
    }
  );

  const nonReciprocal = reciprocityResults.filter((r): r is NonNullable<typeof r> => r !== null && !r.pointsBack);
  const cycles = reciprocityResults.filter((r): r is NonNullable<typeof r> => r !== null && r.cycleDetected);

  if (nonReciprocal.length > 0) {
    checks.push({
      id: "hreflang-no-reciprocity",
      category: "technical",
      name: "Hreflang sans réciprocité",
      status: "warn",
      severity: "medium",
      description: `${nonReciprocal.length}/${alternatesToCheck.length} alternate(s) ne cite(nt) pas la page courante. Google ignore les hreflang non réciproques.`,
      value: nonReciprocal.slice(0, 3).map((r) => `${r.altUrl} (${r.lang})`).join(" | "),
      recommendation: "Chaque page alternate doit lister TOUTES les autres alternates (y compris la page courante) via des balises <link rel=\"alternate\" hreflang>.",
    });
  }

  if (cycles.length > 0) {
    checks.push({
      id: "hreflang-cycle",
      category: "technical",
      name: "Hreflang — chaîne incohérente détectée",
      status: "warn",
      severity: "medium",
      description: `${cycles.length} page(s) alternate déclarent des hreflang pointant vers des pages absentes du graphe de la page courante (asymétrie dans la chaîne).`,
      value: cycles.slice(0, 3).map((r) => `${r.altUrl} → ${r.cycleTarget}`).join(" | "),
      recommendation: "Normalisez le graphe : toutes les pages d'un même cluster doivent déclarer exactement le même jeu de hreflang.",
    });
  }

  // All good → passing check
  if (
    invalidCodes.length === 0 &&
    selfListed &&
    nonReciprocal.length === 0 &&
    cycles.length === 0
  ) {
    checks.push({
      id: "hreflang-valid",
      category: "technical",
      name: "Hreflang international",
      status: "pass",
      description: `${alternates.length} balise(s) hreflang valides avec réciprocité complète${hasXDefault ? " (incluant x-default)" : ""}.`,
      value: [...new Set(alternates.map((a) => a.hreflang!))].join(", "),
    });
  }

  return checks;
}
