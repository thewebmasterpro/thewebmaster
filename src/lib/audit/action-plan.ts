import type { ActionItem, AuditCheck, Severity } from "@/types/audit";

// Effort heuristics — rough estimates in minutes, calibrated so the produced
// action plan is actionable ("2 hours to move from D to B") rather than vague.
const EFFORT_BY_CATEGORY: Record<string, number> = {
  ssl: 15,
  headers: 10,
  "info-leak": 5,
  cookies: 20,
  owasp: 30,
  xss: 45,
  infra: 20,
  rgpd: 60,
  incident: 30,
  performance: 30,
  wordpress: 20,
  cms: 45,
};

const EFFORT_BY_CHECK: Record<string, number> = {
  hsts: 5,
  "x-content-type": 5,
  "x-frame": 5,
  permissions: 5,
  csp: 90,
  "http-redirect": 10,
  "tls-protocol": 20,
  "tls-cert-expiry": 15,
  "secret-aws-access-key": 30,
  "secret-stripe-live": 30,
  "secret-github-pat": 30,
  "secret-openai": 30,
  "secret-anthropic": 30,
  "secret-supabase-service": 30,
  "secret-private-key": 45,
  "dir-listing": 10,
  "graphql-introspection": 10,
  "cors-wildcard-creds": 15,
  "cors-reflect": 30,
  "mixed-content": 60,
  "error-disclosure": 20,
  "debug-mode": 5,
  "backup-exposure": 10,
  "wp-debug-log": 5,
  "wp-config-backup": 5,
  "wp-xmlrpc": 5,
  "wp-rest-users": 15,
  "wp-plugins": 30,
  "cms-outdated": 60,
  "cms-outdated-minor": 20,
  "rgpd-privacy": 60,
  "rgpd-cookies": 90,
};

// Base points gained per severity, scaled by count (one fail is worth less than
// four fails in the same check). We use the relative check weight — each
// scorable check counts as 1 in scoreFromChecks, so fixing one warn gains
// roughly 0.6 / scorableCount * 100 points; fixing a fail gains 1 / n * 100.
function estimatePointsGained(
  check: AuditCheck,
  totalScorableChecks: number,
  failedCount: number
): number {
  if (check.status === "pass" || check.status === "info") return 0;

  // Delta from scoreFromChecks logic:
  // fail → pass: +1 / total
  // warn → pass: +0.6 / total
  const baseDelta = check.status === "fail" ? 1 : 0.6;
  const rawPoints = (baseDelta / Math.max(totalScorableChecks, 1)) * 100;

  // Multiply by severity weight so "critical" shows higher ROI than "low"
  const severityWeight: Record<Severity, number> = {
    critical: 1.5,
    high: 1.2,
    medium: 1.0,
    low: 0.7,
    info: 0.5,
  };
  const sev = check.severity ?? "medium";
  let weighted = rawPoints * severityWeight[sev];

  // Cap so single fixes can't dominate the plan
  weighted = Math.min(weighted, 20);

  // Bonus if it unlocks the "critical" overall status
  if (sev === "critical" && failedCount > 0 && check.status === "fail") {
    weighted += 5;
  }

  return Math.round(weighted * 10) / 10;
}

function estimateEffort(check: AuditCheck): number {
  if (EFFORT_BY_CHECK[check.id]) return EFFORT_BY_CHECK[check.id];
  return EFFORT_BY_CATEGORY[check.category] ?? 30;
}

/**
 * Produces a prioritised action plan ranked by ROI (points per minute of work).
 * Returns at most `limit` items — the goal is a crisp "top N" the user can act on.
 */
export function buildActionPlan(checks: AuditCheck[], limit = 10): ActionItem[] {
  const scorable = checks.filter((c) => c.status !== "info");
  const failed = scorable.filter((c) => c.status === "fail");
  const warned = scorable.filter((c) => c.status === "warn");
  const totalScorable = scorable.length;
  const failedCount = failed.length;

  const items: ActionItem[] = [...failed, ...warned].map((check) => {
    const pointsGained = estimatePointsGained(check, totalScorable, failedCount);
    const effortMinutes = estimateEffort(check);
    const roi = effortMinutes > 0 ? pointsGained / effortMinutes : pointsGained;
    return {
      checkId: check.id,
      title: check.name,
      category: check.category,
      severity: check.severity ?? "medium",
      pointsGained,
      effortMinutes,
      roi,
      recommendation: check.recommendation,
      stackRemediation: check.stackRemediation,
    };
  });

  // Sort: critical first, then highest ROI
  const severityRank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  items.sort((a, b) => {
    const sevDiff = severityRank[a.severity] - severityRank[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.roi - a.roi;
  });

  return items.slice(0, limit);
}
