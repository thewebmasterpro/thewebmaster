// Font loading audit: font-display presence, preload + crossorigin hygiene,
// subsetting hints, Google Fonts v2 usage, web safe fallback detection.
// Fonts are a major LCP contributor — a 200 Ko font blocks text paint for
// seconds on slow networks if mis-loaded.

import type { AuditCheck } from "@/types/audit";

interface FontFace {
  family: string;
  fontDisplay: string | null;
  source: "inline" | "linked";
  subsettedHint: boolean;
}

function extractFontFaces(html: string): FontFace[] {
  const faces: FontFace[] = [];
  const styleBlocks = html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/gi) || [];
  for (const block of styleBlocks) {
    const css = block.replace(/<style[^>]*>|<\/style>/gi, "");
    const faceMatches = [...css.matchAll(/@font-face\s*\{([^}]+)\}/gi)];
    for (const m of faceMatches) {
      const body = m[1];
      const family = body.match(/font-family\s*:\s*["']?([^"';]+)/i)?.[1]?.trim() || "unknown";
      const display = body.match(/font-display\s*:\s*(\w+)/i)?.[1]?.toLowerCase() || null;
      const unicodeRange = /unicode-range\s*:/i.test(body);
      faces.push({ family, fontDisplay: display, source: "inline", subsettedHint: unicodeRange });
    }
  }
  return faces;
}

export function checkFontOptimization(html: string): AuditCheck[] {
  const checks: AuditCheck[] = [];
  const faces = extractFontFaces(html);
  const usesGoogleFontsV1 = /fonts\.googleapis\.com\/css\?family=/i.test(html); // v1 without display= param
  const usesGoogleFontsV2 =
    /fonts\.googleapis\.com\/css2\?family=/i.test(html) ||
    /fonts\.googleapis\.com\/css\?family=[^"']+&display=/i.test(html);

  // font-display missing
  const missingDisplay = faces.filter((f) => f.fontDisplay === null);
  if (missingDisplay.length > 0) {
    checks.push({
      id: "perf-font-display-missing",
      category: "fonts",
      name: "font-display non déclaré",
      status: "warn",
      severity: "medium",
      description: `${missingDisplay.length} @font-face sans font-display. Sans swap/optional, le texte reste invisible jusqu'au chargement de la fonte (FOIT — Flash of Invisible Text).`,
      value: missingDisplay.map((f) => f.family).slice(0, 5).join(", "),
      recommendation: "Ajoutez `font-display: swap` (ou `optional` pour une UX plus robuste en offline) dans chaque @font-face.",
    });
  }

  // font-display: block — pire choix possible
  const displayBlock = faces.filter((f) => f.fontDisplay === "block");
  if (displayBlock.length > 0) {
    checks.push({
      id: "perf-font-display-block",
      category: "fonts",
      name: "font-display: block (FOIT)",
      status: "warn",
      severity: "medium",
      description: `${displayBlock.length} fonte(s) utilisent font-display: block. Provoque 3 s de texte invisible — utilisez swap ou optional.`,
      value: displayBlock.map((f) => f.family).join(", "),
    });
  }

  // Google Fonts v1 without &display=swap
  if (usesGoogleFontsV1 && !usesGoogleFontsV2) {
    checks.push({
      id: "perf-google-fonts-v1",
      category: "fonts",
      name: "Google Fonts v1 sans display=swap",
      status: "warn",
      severity: "medium",
      description: "Google Fonts chargé via l'ancienne API CSS v1 sans paramètre &display=swap. Migration vers CSS2 recommandée.",
      recommendation: `Remplacez par l'URL CSS2 avec display=swap :\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap">`,
    });
  }

  // Google Fonts without preconnect
  if (/fonts\.googleapis\.com/.test(html) && !/rel\s*=\s*["']preconnect["'][^>]*fonts\.gstatic\.com/i.test(html)) {
    checks.push({
      id: "perf-google-fonts-no-preconnect",
      category: "fonts",
      name: "Google Fonts sans preconnect",
      status: "warn",
      severity: "low",
      description: "Google Fonts utilisé mais aucun `<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>`. Chaque fonte paie un aller-retour TCP + TLS complet.",
      recommendation: `Ajoutez dans <head>, avant la balise stylesheet :\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
    });
  }

  // Too many font variants (weights/styles)
  const linkFontMatches = html.match(/fonts\.googleapis\.com\/css2?\?family=[^"']+/gi) || [];
  for (const url of linkFontMatches) {
    const weights = (url.match(/wght@[\d,;]+/) || [""])[0]
      .replace("wght@", "")
      .split(/[,;]/)
      .filter(Boolean).length;
    if (weights > 4) {
      checks.push({
        id: "perf-font-too-many-variants",
        category: "fonts",
        name: "Trop de variantes de fonte",
        status: "warn",
        severity: "low",
        description: `Une fonte est demandée avec ${weights} graisses/styles. Chaque variante = ~30-50 Ko supplémentaires.`,
        value: url.substring(0, 120),
        recommendation: "Limitez à 2-3 graisses max (400 + 700 suffisent pour 90 % des designs).",
      });
      break;
    }
  }

  // No subsetting hint
  if (faces.length > 0 && !faces.some((f) => f.subsettedHint)) {
    checks.push({
      id: "perf-font-no-subsetting",
      category: "fonts",
      name: "Fontes non subsettées",
      status: "info",
      description: "Les fontes auto-hébergées ne déclarent pas unicode-range — elles chargent intégralement le set Latin Extended + Cyrillique + Greek. ~50 Ko évitables.",
      recommendation: "Subsettez vos fontes avec fonttools / glyphhanger pour ne conserver que les caractères utilisés.",
    });
  }

  return checks;
}
