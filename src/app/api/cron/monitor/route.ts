import { NextRequest, NextResponse } from "next/server";
import {
  getActiveSubscriptions,
  getPreviousAudit,
  updateSubscription,
  type MonitorSubscription,
} from "@/lib/db";
import type { AuditResult, Regression } from "@/types/audit";

// Daily monitor: re-audits every subscribed URL, detects regressions vs the
// previous stored audit, and emails the subscriber when the security posture
// has measurably degraded.
//
// Triggered by Vercel Cron (see vercel.json). Protected by CRON_SECRET:
//   Vercel sets `Authorization: Bearer $CRON_SECRET` on every invocation.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const provided = req.headers.get("authorization");
  return provided === `Bearer ${expected}`;
}

async function runSingleAudit(siteUrl: string, auditType: "security" | "seo" | "performance"): Promise<AuditResult | null> {
  // Reuse the main audit endpoint by calling it internally. This ensures the
  // same checks run in cron that run for a user-triggered audit, and any
  // future audit logic change is picked up automatically.
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const endpoint =
    auditType === "security" ? "/api/security-audit" :
    auditType === "seo" ? "/api/seo-audit" :
    "/api/performance-audit";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55000);
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: siteUrl }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as AuditResult;
  } catch {
    return null;
  }
}

function detectRegressions(current: AuditResult, previous: AuditResult): Regression[] {
  const severity: Record<string, number> = { pass: 0, info: 0, warn: 1, fail: 2 };
  const prevMap = new Map(previous.checks.map((c) => [c.id, c]));
  const regressions: Regression[] = [];
  for (const cur of current.checks) {
    const prev = prevMap.get(cur.id);
    if (!prev) continue;
    if ((severity[cur.status] ?? 0) > (severity[prev.status] ?? 0)) {
      regressions.push({
        checkId: cur.id,
        name: cur.name,
        previousStatus: prev.status,
        currentStatus: cur.status,
        previousAuditAt: previous.timestamp,
      });
    }
  }
  return regressions;
}

async function sendRegressionEmail(
  sub: MonitorSubscription,
  current: AuditResult,
  regressions: Regression[]
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  const host = safeHost(sub.siteUrl);
  const auditLabel = sub.auditType === "security" ? "sécurité" : sub.auditType === "seo" ? "SEO" : "performance";
  const subject = `${regressions.length} régression${regressions.length > 1 ? "s" : ""} ${auditLabel} sur ${host}`;
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || "https://thewebmaster.pro";
  const reportSegment = sub.auditType === "security" ? "security-audit" : sub.auditType === "seo" ? "seo-audit" : "performance-audit";
  const reportUrl = current.reportId
    ? `${baseUrl}/fr/${reportSegment}/r/${current.reportId}`
    : `${baseUrl}/fr/${reportSegment}`;

  const rows = regressions.slice(0, 10).map(
    (r) => `
  <tr>
    <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px;color:#6b7280;">${escapeHtml(r.previousStatus)}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px;color:#ea580c;font-weight:600;">→ ${escapeHtml(r.currentStatus)}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:14px;">${escapeHtml(r.name)}</td>
  </tr>`
  ).join("");

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="padding:20px 24px;background:#fff7ed;border-bottom:1px solid #fed7aa;">
      <h1 style="margin:0;font-size:18px;color:#9a3412;">⚠️ ${regressions.length} régression${regressions.length > 1 ? "s" : ""} détectée${regressions.length > 1 ? "s" : ""}</h1>
      <p style="margin:4px 0 0;color:#7c2d12;font-size:14px;">${escapeHtml(host)} — score actuel : <strong>${current.score}/100 (${current.grade})</strong></p>
    </div>
    <div style="padding:20px 24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:20px;text-align:center;">
        <a href="${reportUrl}" style="display:inline-block;padding:10px 20px;background:#0f172a;color:#fff;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px;">Voir le rapport complet</a>
      </div>
    </div>
    <div style="padding:12px 24px;border-top:1px solid #e5e7eb;background:#f9fafb;font-size:12px;color:#6b7280;">
      Vous recevez cet email car vous surveillez ${escapeHtml(host)}. Cet audit est ré-exécuté chaque jour par The Webmaster.
    </div>
  </div>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "The Webmaster <noreply@thewebmaster.pro>",
        to: [sub.email],
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Run for both security AND SEO — subscribers can opt into either or both
  const securitySubs = getActiveSubscriptions("security");
  const seoSubs = getActiveSubscriptions("seo");
  const subs = [...securitySubs, ...seoSubs];
  if (subs.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, regressionsEmailed: 0 });
  }

  const summary: { site: string; auditType: string; regressions: number; emailed: boolean }[] = [];
  let totalRegressions = 0;
  let emailsSent = 0;

  // Process in small batches to stay under the 60 s maxDuration
  const batchSize = 4;
  for (let i = 0; i < subs.length; i += batchSize) {
    const batch = subs.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (sub) => {
        const previous = getPreviousAudit(sub.siteUrl, sub.auditType);
        const current = await runSingleAudit(sub.siteUrl, sub.auditType);
        updateSubscription(sub.id, { lastCheckedAt: new Date().toISOString() });
        if (!current || !previous) {
          summary.push({ site: sub.siteUrl, auditType: sub.auditType, regressions: 0, emailed: false });
          return;
        }
        const prevReport = previous.report as AuditResult | null;
        if (!prevReport) {
          summary.push({ site: sub.siteUrl, auditType: sub.auditType, regressions: 0, emailed: false });
          return;
        }
        const regressions = detectRegressions(current, prevReport);
        if (regressions.length > 0) {
          totalRegressions += regressions.length;
          const sent = await sendRegressionEmail(sub, current, regressions);
          if (sent) {
            emailsSent++;
            updateSubscription(sub.id, { lastRegressionNotifiedAt: new Date().toISOString() });
          }
          summary.push({ site: sub.siteUrl, auditType: sub.auditType, regressions: regressions.length, emailed: sent });
        } else {
          summary.push({ site: sub.siteUrl, auditType: sub.auditType, regressions: 0, emailed: false });
        }
      })
    );
  }

  return NextResponse.json({
    ok: true,
    checked: subs.length,
    totalRegressions,
    emailsSent,
    summary,
  });
}
