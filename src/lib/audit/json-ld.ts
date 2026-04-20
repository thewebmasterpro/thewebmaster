// JSON-LD validator: parses <script type="application/ld+json"> blocks and
// validates the most common Schema.org types against their required properties.
// Catches malformed JSON (current tool swallows it silently) AND structurally
// incomplete objects (e.g. Article without author, Product without offers).

import type { AuditCheck } from "@/types/audit";
import { stripScriptsAndStyles as _strip } from "./html-parse";
void _strip; // explicit import marker — parseJsonLdBlocks needs raw HTML, not stripped

// Required-ish properties for each Schema.org type. "Required" here means
// "expected by Google Rich Results" — missing these disqualifies the snippet
// from appearing as a rich result.
const REQUIRED_PROPS: Record<string, string[]> = {
  Article: ["headline", "author", "datePublished"],
  BlogPosting: ["headline", "author", "datePublished"],
  NewsArticle: ["headline", "author", "datePublished"],
  Product: ["name", "image", "offers"],
  Organization: ["name", "url"],
  LocalBusiness: ["name", "address"],
  Person: ["name"],
  FAQPage: ["mainEntity"],
  HowTo: ["name", "step"],
  Recipe: ["name", "recipeIngredient", "recipeInstructions"],
  Review: ["itemReviewed", "author", "reviewRating"],
  Event: ["name", "startDate", "location"],
  BreadcrumbList: ["itemListElement"],
  SoftwareApplication: ["name", "applicationCategory"],
  WebSite: ["name", "url"],
  VideoObject: ["name", "thumbnailUrl", "uploadDate"],
};

export interface ParsedJsonLd {
  type: string;
  raw: unknown;
  missingProps: string[];
}

export interface JsonLdValidationResult {
  blocks: ParsedJsonLd[];
  malformedCount: number;
  types: string[];
  checks: AuditCheck[];
}

function getType(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") return t;
  if (Array.isArray(t) && typeof t[0] === "string") return t[0];
  return null;
}

function flattenGraph(root: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  if (!root || typeof root !== "object") return out;
  const obj = root as Record<string, unknown>;
  if (Array.isArray(root)) {
    for (const item of root as unknown[]) out.push(...flattenGraph(item));
    return out;
  }
  if (Array.isArray(obj["@graph"])) {
    for (const item of obj["@graph"] as unknown[]) out.push(...flattenGraph(item));
    // Parent itself isn't a typed node in most @graph uses
    return out;
  }
  out.push(obj);
  return out;
}

function checkRequiredProps(node: Record<string, unknown>, type: string): string[] {
  const required = REQUIRED_PROPS[type];
  if (!required) return [];
  return required.filter((prop) => {
    const v = node[prop];
    if (v === undefined || v === null) return true;
    // Google accepts author as string OR object — just check non-empty
    if (typeof v === "string" && v.trim() === "") return true;
    if (Array.isArray(v)) {
      if (v.length === 0) return true;
      // Array of objects/strings — check at least one is non-empty
      return !v.some((item) => {
        if (typeof item === "string") return item.trim() !== "";
        if (item && typeof item === "object") return Object.keys(item).length > 0;
        return false;
      });
    }
    // Object: needs at least one non-empty property (Schema Person with just @type but no name is invalid)
    if (typeof v === "object" && v !== null) {
      const keys = Object.keys(v as Record<string, unknown>).filter((k) => k !== "@type" && k !== "@context");
      return keys.length === 0;
    }
    return false;
  });
}

export function validateJsonLd(html: string): JsonLdValidationResult {
  const blocks: ParsedJsonLd[] = [];
  const checks: AuditCheck[] = [];
  let malformedCount = 0;
  const typeSet = new Set<string>();

  const regex = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const nodes = flattenGraph(parsed);
      for (const node of nodes) {
        const type = getType(node);
        if (!type) continue;
        typeSet.add(type);
        const missing = checkRequiredProps(node, type);
        blocks.push({ type, raw: node, missingProps: missing });
      }
    } catch {
      malformedCount++;
    }
  }

  if (malformedCount > 0) {
    checks.push({
      id: "jsonld-malformed",
      category: "technical",
      name: "JSON-LD malformé",
      status: "fail",
      severity: "high",
      description: `${malformedCount} bloc(s) <script type="application/ld+json"> contiennent du JSON invalide. Google ne pourra pas les utiliser pour les rich results.`,
      value: `${malformedCount} bloc(s)`,
      recommendation: "Validez chaque bloc avec https://validator.schema.org/ ou https://search.google.com/test/rich-results.",
    });
  }

  const blocksWithIssues = blocks.filter((b) => b.missingProps.length > 0);
  if (blocksWithIssues.length > 0) {
    const byType = new Map<string, string[]>();
    for (const b of blocksWithIssues) {
      byType.set(b.type, (byType.get(b.type) ?? []).concat(b.missingProps));
    }
    const lines = [...byType.entries()].map(
      ([t, props]) => `${t} (manquent : ${[...new Set(props)].join(", ")})`
    );
    checks.push({
      id: "jsonld-incomplete",
      category: "technical",
      name: "Schema.org incomplet pour les rich results",
      status: "warn",
      severity: "medium",
      description: `${blocksWithIssues.length} bloc(s) Schema.org ont des propriétés requises manquantes.`,
      value: lines.join(" | "),
      recommendation: "Complétez les propriétés requises par Google pour obtenir des rich snippets (étoiles, images produit, FAQ inline).",
    });
  }

  if (blocks.length > 0 && malformedCount === 0 && blocksWithIssues.length === 0) {
    checks.push({
      id: "jsonld-valid",
      category: "technical",
      name: "JSON-LD valide et complet",
      status: "pass",
      description: `${blocks.length} bloc(s) JSON-LD valides (types : ${[...typeSet].join(", ")}).`,
      value: [...typeSet].join(", "),
    });
  }

  if (blocks.length === 0 && malformedCount === 0) {
    checks.push({
      id: "jsonld-absent",
      category: "technical",
      name: "Données structurées (Schema.org)",
      status: "warn",
      severity: "medium",
      description: "Aucune donnée structurée JSON-LD détectée. Les rich results Google nécessitent Schema.org.",
      recommendation: "Ajoutez du JSON-LD adapté : Article pour les billets de blog, Product + Offer pour l'ecommerce, Organization pour le footer, BreadcrumbList pour la nav.",
    });
  }

  return { blocks, malformedCount, types: [...typeSet], checks };
}

// Convenience: returns just the list of detected @type strings for use by
// other modules (site-context detection, threat model calibration).
export function detectSchemaTypes(html: string): string[] {
  return validateJsonLd(html).types;
}
