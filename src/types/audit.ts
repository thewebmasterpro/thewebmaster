// Shared audit types — imported by API route, UI client, report page, badge route.

export type CheckStatus = "pass" | "warn" | "fail" | "info";
export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface ComplianceRef {
  framework: "GDPR" | "PCI-DSS" | "ISO-27001" | "OWASP-Top-10" | "NIST" | "HIPAA";
  clause: string;
  label?: string;
}

export interface StackRemediation {
  stack: string;
  language: "bash" | "nginx" | "apache" | "ts" | "js" | "php" | "yaml" | "html";
  code: string;
  description?: string;
}

export interface AuditCheck {
  id: string;
  category: string;
  name: string;
  status: CheckStatus;
  severity?: Severity;
  description: string;
  value?: string;
  recommendation?: string;
  compliance?: ComplianceRef[];
  stackRemediation?: StackRemediation;
  pointsImpact?: number;
  effortMinutes?: number;
}

export interface CategoryScore {
  category: string;
  label: string;
  score: number;
  grade: string;
  total: number;
  passed: number;
  warned: number;
  failed: number;
}

export interface CMSInfo {
  name: string | null;
  version: string | null;
  isOutdated: boolean | null;
  theme: { name: string; version?: string } | null;
  plugins: { name: string; version?: string }[];
}

export interface StackInfo {
  frontend: string | null;
  backend: string | null;
  cms: string | null;
  hosting: string | null;
  server: string | null;
  database: string | null;
  primaryFramework: string | null;
}

export interface ActionItem {
  checkId: string;
  title: string;
  category: string;
  severity: Severity;
  pointsGained: number;
  effortMinutes: number;
  roi: number;
  recommendation?: string;
  stackRemediation?: StackRemediation;
}

export interface ThreatVector {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  relatedCheckIds: string[];
  mitigations: string[];
}

export interface Regression {
  checkId: string;
  name: string;
  previousStatus: CheckStatus;
  currentStatus: CheckStatus;
  previousAuditAt: string;
}

export type AuditStatus = "production-ready" | "needs-fixes" | "at-risk" | "critical";

// SEO-specific page context captured once per audit
export interface SeoMeta {
  title: string | null;
  description: string | null;
  canonical: string | null;
  ogImage: string | null;
  language: string | null;
  robots: string | null;
}

export interface SeoHeading {
  tag: string;
  text: string;
}

export interface SeoLinkStats {
  internal: number;
  external: number;
  broken: number;
}

export interface SeoImageStats {
  total: number;
  withAlt: number;
  withoutAlt: number;
}

// Inferred site-type context — calibrates SEO check severities so that a
// 120-word landing doesn't get flagged as harshly as an article.
export type SiteType = "landing" | "blog" | "article" | "saas" | "ecommerce" | "corporate" | "unknown";

export interface SiteContext {
  type: SiteType;
  confidence: "low" | "medium" | "high";
  signals: string[];
}

export interface AuditResult {
  url: string;
  timestamp: string;
  score: number;
  grade: string;
  status: AuditStatus;
  checks: AuditCheck[];
  categoryScores: CategoryScore[];
  responseTime: number;
  tlsInfo: { secure: boolean };
  technologies: string[];
  cmsInfo: CMSInfo | null;

  reportId?: string;
  stack?: StackInfo;
  actionPlan?: ActionItem[];
  threatModel?: ThreatVector[];
  regressions?: Regression[];
  crawledRoutes?: string[];
  publicUrl?: string;

  // SEO-specific fields — optional so the same type works for security audits
  seoMeta?: SeoMeta;
  headings?: SeoHeading[];
  links?: SeoLinkStats;
  images?: SeoImageStats;
  pageSize?: number;
  siteContext?: SiteContext;
}
