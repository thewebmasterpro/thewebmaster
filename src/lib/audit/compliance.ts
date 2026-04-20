import type { AuditCheck, ComplianceRef } from "@/types/audit";

// Maps check IDs (or category fallback) to the relevant compliance clauses.
// Each finding carries compliance context so the report can be used directly
// by DPO / RSSI / auditors without cross-referencing external docs.

const CHECK_COMPLIANCE: Record<string, ComplianceRef[]> = {
  // SSL / TLS
  ssl: [
    { framework: "OWASP-Top-10", clause: "A02:2021", label: "Cryptographic Failures" },
    { framework: "PCI-DSS", clause: "4.1", label: "Use strong cryptography during transmission" },
    { framework: "ISO-27001", clause: "A.10.1.1" },
  ],
  "tls-protocol": [
    { framework: "PCI-DSS", clause: "4.2.1", label: "TLS 1.2 minimum requis" },
    { framework: "OWASP-Top-10", clause: "A02:2021" },
  ],
  "tls-cipher": [
    { framework: "PCI-DSS", clause: "4.1" },
    { framework: "NIST", clause: "SP 800-52 Rev. 2" },
  ],
  "tls-cert-expiry": [{ framework: "PCI-DSS", clause: "4.1" }],
  hsts: [
    { framework: "OWASP-Top-10", clause: "A05:2021", label: "Security Misconfiguration" },
    { framework: "PCI-DSS", clause: "4.1" },
  ],
  "http-redirect": [{ framework: "PCI-DSS", clause: "4.1" }],

  // Security headers
  csp: [
    { framework: "OWASP-Top-10", clause: "A03:2021", label: "Injection (XSS mitigation)" },
    { framework: "ISO-27001", clause: "A.14.2.5" },
  ],
  "x-frame": [
    { framework: "OWASP-Top-10", clause: "A05:2021", label: "Security Misconfiguration (Clickjacking)" },
  ],
  "x-content-type": [{ framework: "OWASP-Top-10", clause: "A05:2021" }],
  permissions: [{ framework: "GDPR", clause: "Art. 25", label: "Privacy by design" }],

  // Info leakage
  "server-header": [{ framework: "OWASP-Top-10", clause: "A05:2021" }],
  "x-powered-by": [{ framework: "OWASP-Top-10", clause: "A05:2021" }],

  // Secrets
  "secret-aws-access-key": [
    { framework: "OWASP-Top-10", clause: "A07:2021", label: "Identification and Authentication Failures" },
    { framework: "ISO-27001", clause: "A.9.4.3", label: "Secret management" },
    { framework: "PCI-DSS", clause: "3.5", label: "Key management" },
  ],
  "secret-stripe-live": [
    { framework: "PCI-DSS", clause: "3.2", label: "Ne jamais stocker les secrets côté client" },
    { framework: "OWASP-Top-10", clause: "A07:2021" },
  ],
  "secret-github-pat": [{ framework: "ISO-27001", clause: "A.9.4.3" }],
  "secret-private-key": [
    { framework: "PCI-DSS", clause: "3.5" },
    { framework: "ISO-27001", clause: "A.10.1.2" },
  ],
  "secret-supabase-service": [
    { framework: "OWASP-Top-10", clause: "A01:2021", label: "Broken Access Control" },
    { framework: "GDPR", clause: "Art. 32", label: "Security of processing" },
  ],

  // Cookies
  "cookie-session": [
    { framework: "OWASP-Top-10", clause: "A07:2021" },
    { framework: "GDPR", clause: "Art. 32" },
  ],
  cookies: [
    { framework: "GDPR", clause: "Art. 32" },
    { framework: "PCI-DSS", clause: "6.5.4" },
  ],

  // OWASP / Sensitive files
  "owasp--env": [
    { framework: "OWASP-Top-10", clause: "A05:2021" },
    { framework: "ISO-27001", clause: "A.9.4.5", label: "Source code access control" },
    { framework: "PCI-DSS", clause: "6.5" },
  ],
  "owasp--git-HEAD": [{ framework: "OWASP-Top-10", clause: "A05:2021" }],
  "owasp--git-config": [{ framework: "OWASP-Top-10", clause: "A05:2021" }],
  "dir-listing": [
    { framework: "OWASP-Top-10", clause: "A05:2021" },
    { framework: "ISO-27001", clause: "A.9.1.2" },
  ],
  "graphql-introspection": [
    { framework: "OWASP-Top-10", clause: "A05:2021" },
    { framework: "OWASP-Top-10", clause: "A01:2021" },
  ],
  "mixed-content": [{ framework: "PCI-DSS", clause: "4.1" }],
  "cors-wildcard-creds": [{ framework: "OWASP-Top-10", clause: "A05:2021" }],
  "cors-reflect": [{ framework: "OWASP-Top-10", clause: "A01:2021" }],

  // XSS
  "inline-handlers": [{ framework: "OWASP-Top-10", clause: "A03:2021" }],
  "eval-usage": [{ framework: "OWASP-Top-10", clause: "A03:2021" }],
  csrf: [{ framework: "OWASP-Top-10", clause: "A01:2021" }],

  // RGPD
  "rgpd-privacy": [
    { framework: "GDPR", clause: "Art. 13-14", label: "Information obligatoire de la personne concernée" },
    { framework: "GDPR", clause: "Art. 12" },
  ],
  "rgpd-legal": [{ framework: "GDPR", clause: "Art. 13" }],
  "rgpd-cookies": [
    { framework: "GDPR", clause: "Art. 7", label: "Consentement" },
    { framework: "GDPR", clause: "ePrivacy Art. 5(3)" },
  ],
  "rgpd-trackers": [{ framework: "GDPR", clause: "Art. 6" }],
  "rgpd-data-collection": [{ framework: "GDPR", clause: "Art. 5", label: "Minimisation" }],

  // Incident
  "error-disclosure": [{ framework: "OWASP-Top-10", clause: "A09:2021", label: "Security Logging and Monitoring Failures" }],
  "debug-mode": [{ framework: "OWASP-Top-10", clause: "A05:2021" }],
  "backup-exposure": [
    { framework: "OWASP-Top-10", clause: "A05:2021" },
    { framework: "GDPR", clause: "Art. 32" },
  ],
  monitoring: [{ framework: "OWASP-Top-10", clause: "A09:2021" }],

  // SEO checks — mapped to Google Search Essentials, Schema.org, WCAG
  "tech-https": [{ framework: "NIST", clause: "Google Search Essentials — Technical" }],
  "tech-ttfb": [{ framework: "NIST", clause: "Core Web Vitals — TTFB" }],
  "tech-sitemap": [{ framework: "NIST", clause: "Google Search Essentials — Crawlability" }],
  "tech-robots": [{ framework: "NIST", clause: "Google Search Essentials — Robots" }],
  "tech-canonical": [{ framework: "NIST", clause: "Google Search Essentials — Duplicates" }],
  "tech-viewport": [
    { framework: "NIST", clause: "Google Mobile-First Indexing" },
    { framework: "ISO-27001", clause: "WCAG 2.1 — 1.4.10 Reflow" },
  ],
  "sitemap-absent": [{ framework: "NIST", clause: "Google Search Essentials — Sitemaps" }],
  "sitemap-soft-404": [{ framework: "NIST", clause: "Google Search Essentials — Soft 404" }],
  "jsonld-malformed": [{ framework: "NIST", clause: "Schema.org — Validator" }],
  "jsonld-incomplete": [{ framework: "NIST", clause: "Google Rich Results — Required properties" }],
  "hreflang-invalid-code": [{ framework: "NIST", clause: "Google International SEO — hreflang" }],
  "hreflang-no-reciprocity": [{ framework: "NIST", clause: "Google International SEO — Reciprocity" }],
  "onpage-title": [{ framework: "NIST", clause: "Google Search Essentials — Titles" }],
  "onpage-metadesc": [{ framework: "NIST", clause: "Google Search Essentials — Meta descriptions" }],
  "onpage-h1": [{ framework: "NIST", clause: "Google Search Essentials — Heading hierarchy" }],
  "onpage-img-alt": [
    { framework: "ISO-27001", clause: "WCAG 2.1 — 1.1.1 Non-text Content" },
    { framework: "NIST", clause: "Google Search Essentials — Images" },
  ],
  "onpage-meta-robots": [{ framework: "NIST", clause: "Google Search Essentials — Indexing" }],
  "og-image-too-small": [{ framework: "NIST", clause: "Open Graph Protocol — og:image" }],
  "og-image-http": [{ framework: "NIST", clause: "Open Graph Protocol — og:image" }],

  // Performance — mapped to Google Page Experience, Web Almanac budgets, WCAG
  "cwv-lcp": [{ framework: "NIST", clause: "Google Page Experience — LCP < 2.5 s" }],
  "cwv-cls": [{ framework: "NIST", clause: "Google Page Experience — CLS < 0.1" }],
  "cwv-inp": [{ framework: "NIST", clause: "Google Page Experience — INP < 200 ms" }],
  "cwv-lighthouse-score": [{ framework: "NIST", clause: "Lighthouse Performance" }],
  "perf-budget-scripts": [{ framework: "NIST", clause: "Web Almanac — JavaScript budget" }],
  "perf-budget-images": [{ framework: "NIST", clause: "Web Almanac — Image budget" }],
  "perf-budget-total": [{ framework: "NIST", clause: "RAIL Performance Model" }],
  "perf-blocking-scripts": [{ framework: "NIST", clause: "Google Critical Rendering Path" }],
  "perf-blocking-css": [{ framework: "NIST", clause: "Google Critical Rendering Path" }],
  "perf-font-display-missing": [
    { framework: "NIST", clause: "Google Page Experience — Font Display" },
    { framework: "ISO-27001", clause: "WCAG 2.1 — 2.2.2 Pause/Stop (Flash of Invisible Text)" },
  ],
  "perf-third-party-count": [{ framework: "NIST", clause: "Google Page Experience — Third-party impact" }],

  // CMS / WordPress specifics
  "wp-debug-log": [{ framework: "OWASP-Top-10", clause: "A05:2021" }],
  "wp-config-backup": [{ framework: "OWASP-Top-10", clause: "A05:2021" }, { framework: "GDPR", clause: "Art. 32" }],
  "wp-plugins": [
    { framework: "OWASP-Top-10", clause: "A06:2021", label: "Vulnerable and Outdated Components" },
    { framework: "ISO-27001", clause: "A.12.6.1" },
  ],
  "wp-rest-users": [{ framework: "OWASP-Top-10", clause: "A01:2021" }, { framework: "GDPR", clause: "Art. 32" }],
  "cms-outdated": [{ framework: "OWASP-Top-10", clause: "A06:2021" }],
  "cms-outdated-minor": [{ framework: "OWASP-Top-10", clause: "A06:2021" }],
};

const CATEGORY_FALLBACK: Record<string, ComplianceRef[]> = {
  ssl: [{ framework: "PCI-DSS", clause: "4.1" }],
  headers: [{ framework: "OWASP-Top-10", clause: "A05:2021" }],
  "info-leak": [{ framework: "OWASP-Top-10", clause: "A05:2021" }],
  owasp: [{ framework: "OWASP-Top-10", clause: "A05:2021" }],
  xss: [{ framework: "OWASP-Top-10", clause: "A03:2021" }],
  rgpd: [{ framework: "GDPR", clause: "Art. 32" }],
  incident: [{ framework: "OWASP-Top-10", clause: "A09:2021" }],
  cookies: [{ framework: "GDPR", clause: "Art. 32" }],
  wordpress: [{ framework: "OWASP-Top-10", clause: "A06:2021" }],
  cms: [{ framework: "OWASP-Top-10", clause: "A06:2021" }],
  technical: [{ framework: "NIST", clause: "Google Search Essentials" }],
  onpage: [{ framework: "NIST", clause: "Google Search Essentials — On-page" }],
  performance: [{ framework: "NIST", clause: "Core Web Vitals" }],
  offpage: [{ framework: "NIST", clause: "Google E-E-A-T" }],
};

export function enrichWithCompliance(checks: AuditCheck[]): AuditCheck[] {
  return checks.map((check) => {
    if (check.status === "pass" || check.status === "info") return check;
    const direct = CHECK_COMPLIANCE[check.id];
    if (direct) return { ...check, compliance: direct };
    const fallback = CATEGORY_FALLBACK[check.category];
    if (fallback) return { ...check, compliance: fallback };
    return check;
  });
}

// Aggregate compliance coverage across the report — useful for exec summary.
export function summarizeCompliance(checks: AuditCheck[]): { framework: string; failingClauses: string[] }[] {
  const byFramework = new Map<string, Set<string>>();
  for (const c of checks) {
    if (c.status !== "fail" || !c.compliance) continue;
    for (const ref of c.compliance) {
      const existing = byFramework.get(ref.framework) ?? new Set<string>();
      existing.add(ref.clause);
      byFramework.set(ref.framework, existing);
    }
  }
  return [...byFramework.entries()].map(([framework, clauses]) => ({
    framework,
    failingClauses: [...clauses].sort(),
  }));
}
