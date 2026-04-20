import type { AuditCheck } from "@/types/audit";

// Deep CSP analysis: parses each directive and scores their strength.
// Most tools only check presence of the header — they miss sites that HAVE
// a CSP but with `unsafe-eval` or `* data: blob:` everywhere, providing
// essentially no protection.

interface ParsedCsp {
  directives: Map<string, string[]>;
}

function parseCsp(csp: string): ParsedCsp {
  const directives = new Map<string, string[]>();
  for (const chunk of csp.split(";")) {
    const tokens = chunk.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const name = tokens[0].toLowerCase();
    directives.set(name, tokens.slice(1));
  }
  return { directives };
}

function hasToken(values: string[], token: string): boolean {
  const needle = token.toLowerCase();
  return values.some((v) => v.toLowerCase() === needle);
}

function hasWildcard(values: string[]): boolean {
  return values.some((v) => v === "*" || v === "http:" || v === "https:" || v === "data:" || v === "blob:");
}

export function analyzeCSP(cspHeaderValue: string | null): AuditCheck[] {
  if (!cspHeaderValue) return [];
  const { directives } = parseCsp(cspHeaderValue);
  const checks: AuditCheck[] = [];

  const scriptSrc = directives.get("script-src") ?? directives.get("default-src") ?? [];
  const styleSrc = directives.get("style-src") ?? directives.get("default-src") ?? [];
  const frameAncestors = directives.get("frame-ancestors") ?? [];
  const baseUri = directives.get("base-uri") ?? [];
  const objectSrc = directives.get("object-src") ?? directives.get("default-src") ?? [];

  const hasNonce = scriptSrc.some((v) => /^'nonce-/i.test(v));
  const hasHash = scriptSrc.some((v) => /^'sha(256|384|512)-/i.test(v));
  const hasStrictDynamic = hasToken(scriptSrc, "'strict-dynamic'");

  const scriptIssues: string[] = [];
  if (hasToken(scriptSrc, "'unsafe-eval'")) scriptIssues.push("unsafe-eval");
  if (hasToken(scriptSrc, "'unsafe-inline'") && !hasStrictDynamic) scriptIssues.push("unsafe-inline (sans strict-dynamic)");
  if (hasWildcard(scriptSrc)) scriptIssues.push("wildcard sur script-src (* / https:)");

  // script-src quality
  if (scriptSrc.length > 0) {
    let status: "pass" | "warn" | "fail" = "pass";
    let severity: "critical" | "high" | "medium" | "low" | undefined;
    let description: string;
    if (scriptIssues.length === 0 && (hasNonce || hasHash || hasStrictDynamic)) {
      description = `script-src robuste${hasStrictDynamic ? " avec strict-dynamic" : hasNonce ? " avec nonces" : " avec hashes"}.`;
    } else if (scriptIssues.length === 0) {
      status = "pass";
      description = "script-src défini sans nonce/hash, mais sans directives faibles.";
    } else {
      status = scriptIssues.length >= 2 ? "fail" : "warn";
      severity = scriptIssues.some((i) => i.includes("unsafe-eval")) ? "high" : "medium";
      description = `script-src permissif : ${scriptIssues.join(", ")}. La protection XSS est fortement dégradée.`;
    }
    checks.push({
      id: "csp-script-src",
      category: "headers",
      name: "CSP : directive script-src",
      status,
      severity,
      description,
      value: scriptSrc.join(" "),
      recommendation: scriptIssues.length > 0
        ? `Utilisez des nonces + 'strict-dynamic'. Exemple : script-src 'self' 'nonce-{RANDOM}' 'strict-dynamic';`
        : undefined,
    });
  }

  // style-src quality
  if (styleSrc.length > 0) {
    const styleIssues: string[] = [];
    if (hasToken(styleSrc, "'unsafe-inline'")) styleIssues.push("unsafe-inline");
    if (hasWildcard(styleSrc)) styleIssues.push("wildcard (* / https:)");
    if (styleIssues.length > 0) {
      checks.push({
        id: "csp-style-src",
        category: "headers",
        name: "CSP : directive style-src",
        status: "info",
        description: `style-src : ${styleIssues.join(", ")}. Impact XSS limité pour les styles, mais bonne pratique d'utiliser des nonces.`,
        value: styleSrc.join(" "),
      });
    }
  }

  // frame-ancestors — anti-clickjacking
  if (frameAncestors.length === 0) {
    checks.push({
      id: "csp-frame-ancestors",
      category: "headers",
      name: "CSP : frame-ancestors",
      status: "warn",
      severity: "low",
      description: "frame-ancestors non défini. Le site peut potentiellement être intégré en iframe par n'importe quel site (si X-Frame-Options absent aussi).",
      recommendation: `Ajoutez: frame-ancestors 'none'  # ou 'self' si vous utilisez des iframes internes.`,
    });
  } else {
    const permissive = hasToken(frameAncestors, "*") || hasWildcard(frameAncestors);
    if (permissive) {
      checks.push({
        id: "csp-frame-ancestors",
        category: "headers",
        name: "CSP : frame-ancestors",
        status: "warn",
        severity: "medium",
        description: `frame-ancestors permissif (${frameAncestors.join(" ")}). N'importe quel site peut intégrer vos pages en iframe — risque de clickjacking.`,
        recommendation: `Remplacez par 'none' ou 'self'.`,
      });
    }
  }

  // base-uri — anti base-tag injection
  if (baseUri.length === 0) {
    checks.push({
      id: "csp-base-uri",
      category: "headers",
      name: "CSP : base-uri",
      status: "info",
      description: "base-uri non défini. Une injection de <base href=\"https://evil.com/\"> peut rediriger les requêtes relatives.",
      recommendation: `Ajoutez: base-uri 'self';`,
    });
  }

  // object-src — anti Flash/plugin injection
  if (objectSrc.length === 0 || !hasToken(objectSrc, "'none'")) {
    checks.push({
      id: "csp-object-src",
      category: "headers",
      name: "CSP : object-src",
      status: "info",
      description: "object-src n'est pas 'none'. Des tags <object>/<embed>/<applet> pourraient charger du contenu arbitraire.",
      recommendation: `Ajoutez: object-src 'none';`,
    });
  }

  // Global summary — if CSP is entirely built on * wildcards, flag as near-useless
  let wildcardCount = 0;
  for (const [, values] of directives) {
    if (hasWildcard(values)) wildcardCount++;
  }
  if (wildcardCount >= 3) {
    checks.push({
      id: "csp-weak-overall",
      category: "headers",
      name: "CSP : sécurité globale faible",
      status: "warn",
      severity: "medium",
      description: `${wildcardCount} directives utilisent des wildcards (*, https:, data:…). Cette CSP ne protège pas contre les XSS en pratique.`,
      recommendation: "Reconstruisez votre CSP avec des origines explicites, des nonces/hashes pour les scripts inline, et 'strict-dynamic'.",
    });
  }

  return checks;
}
