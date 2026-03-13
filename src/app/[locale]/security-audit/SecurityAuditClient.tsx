"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Search,
  Globe,
  Clock,
  Server,
  Cookie,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Bug,
  Scale,
  Siren,
  Network,
  Gauge,
  FileText,
  Copy,
  Check,
  Download,
  Blocks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import { translations, type SecurityTranslations, getDateLocale } from "./translations";
import UnlockGate from "@/components/UnlockGate";

interface AuditCheck {
  id: string;
  category: string;
  name: string;
  status: "pass" | "warn" | "fail" | "info";
  severity?: "critical" | "high" | "medium" | "low" | "info";
  description: string;
  value?: string;
  recommendation?: string;
}

interface CategoryScore {
  category: string;
  label: string;
  score: number;
  grade: string;
  total: number;
  passed: number;
  warned: number;
  failed: number;
}

interface AuditResult {
  url: string;
  timestamp: string;
  score: number;
  grade: string;
  status: "production-ready" | "needs-fixes" | "at-risk" | "critical";
  checks: AuditCheck[];
  categoryScores: CategoryScore[];
  responseTime: number;
  tlsInfo: { secure: boolean; protocol?: string };
  technologies: string[];
}

function getCategoryLabels(t: SecurityTranslations): Record<string, { label: string; icon: typeof Shield }> {
  return {
    ssl: { label: t.catSsl, icon: Lock },
    headers: { label: t.catHeaders, icon: Shield },
    "info-leak": { label: t.catInfoLeak, icon: Server },
    cookies: { label: t.catCookies, icon: Cookie },
    owasp: { label: t.catOwasp, icon: Bug },
    xss: { label: t.catXss, icon: ShieldAlert },
    infra: { label: t.catInfra, icon: Network },
    rgpd: { label: t.catRgpd, icon: Scale },
    incident: { label: t.catIncident, icon: Siren },
    performance: { label: t.catPerformance, icon: Gauge },
    wordpress: { label: t.catWordpress, icon: Blocks },
    misc: { label: t.catMisc, icon: Globe },
  };
}

function getStatusConfig(t: SecurityTranslations) {
  return {
    pass: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: t.statusOk },
    warn: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10", label: t.statusWarn },
    fail: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: t.statusFail },
    info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", label: t.statusInfo },
  };
}

function getSeverityConfig(t: SecurityTranslations): Record<string, { label: string; color: string }> {
  return {
    critical: { label: t.sevCritical, color: "text-red-600 bg-red-500/15 border-red-500/30" },
    high: { label: t.sevHigh, color: "text-orange-500 bg-orange-500/15 border-orange-500/30" },
    medium: { label: t.sevMedium, color: "text-yellow-500 bg-yellow-500/15 border-yellow-500/30" },
    low: { label: t.sevLow, color: "text-blue-400 bg-blue-400/15 border-blue-400/30" },
  };
}

function getStatusLabels(t: SecurityTranslations): Record<string, string> {
  return {
    "production-ready": "\u2705 " + t.statusProductionReady,
    "needs-fixes": "\u26a0\ufe0f " + t.statusNeedsFixes,
    "at-risk": "\ud83d\udfe0 " + t.statusAtRisk,
    critical: "\ud83d\udd34 " + t.statusCriticalAction,
  };
}

const gradeColors: Record<string, string> = {
  "A+": "from-green-500 to-emerald-600",
  A: "from-green-500 to-green-600",
  B: "from-lime-500 to-green-500",
  C: "from-yellow-500 to-amber-500",
  D: "from-orange-500 to-red-500",
  F: "from-red-500 to-red-700",
};

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-40 h-40">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" strokeWidth="8" className="stroke-muted/20" />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            "transition-all duration-1000 ease-out",
            score >= 85 ? "stroke-green-500" : score >= 60 ? "stroke-yellow-500" : "stroke-red-500"
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "text-4xl font-bold bg-gradient-to-b bg-clip-text text-transparent",
            gradeColors[grade] || gradeColors.F
          )}
        >
          {grade}
        </span>
        <span className="text-sm text-muted-foreground">{score}/100</span>
      </div>
    </div>
  );
}

function CheckCard({ check, t }: { check: AuditCheck; t: SecurityTranslations }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = getStatusConfig(t);
  const sevCfg = getSeverityConfig(t);
  const config = statusCfg[check.status];
  const StatusIcon = config.icon;
  const sev = check.severity && check.severity !== "info" ? sevCfg[check.severity] : null;

  return (
    <div
      className={cn(
        "border rounded-xl transition-all",
        check.severity === "critical" ? "border-red-500/40 bg-red-500/5" :
        check.status === "fail" ? "border-red-500/30" : "border-border/50"
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors rounded-xl"
      >
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
          <StatusIcon className={cn("w-4 h-4", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{check.name}</p>
          <p className="text-xs text-muted-foreground truncate">{check.description}</p>
        </div>
        {sev && (
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0", sev.color)}>
            {sev.label}
          </span>
        )}
        <span
          className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full shrink-0",
            config.bg,
            config.color
          )}
        >
          {config.label}
        </span>
        {(check.value || check.recommendation) && (
          expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          )
        )}
      </button>
      {expanded && (check.value || check.recommendation) && (
        <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3 mx-4 mb-1">
          {check.value && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.valueLabel}</p>
              <pre className="text-xs bg-muted/50 px-2 py-1 rounded block break-all whitespace-pre-wrap overflow-x-auto">
                {check.value}
              </pre>
            </div>
          )}
          {check.recommendation && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.recommendationLabel}</p>
              {check.recommendation.includes("\n") ? (
                <pre className="text-xs text-primary bg-muted/30 px-3 py-2 rounded-lg whitespace-pre-wrap overflow-x-auto font-mono">
                  {check.recommendation}
                </pre>
              ) : (
                <p className="text-xs text-primary">{check.recommendation}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// AUTO-GENERATED REPORT
// =============================================================================

function generateReportText(result: AuditResult, t: SecurityTranslations, dateLocale: string): string {
  const date = new Date(result.timestamp).toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = new Date(result.timestamp).toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const hostname = new URL(result.url).hostname;
  const sLabels = getStatusLabels(t);

  const criticals = result.checks.filter((c) => c.severity === "critical" && c.status === "fail");
  const highs = result.checks.filter((c) => c.severity === "high" && c.status === "fail");
  const mediums = result.checks.filter((c) => c.severity === "medium");
  const lows = result.checks.filter((c) => c.severity === "low");
  const passes = result.checks.filter((c) => c.status === "pass");
  const fails = result.checks.filter((c) => c.status === "fail");
  const warns = result.checks.filter((c) => c.status === "warn");

  const line = `───────────────────────────────────────────────────────────────`;
  const doubleLine = `═══════════════════════════════════════════════════════════════`;

  let r = "";

  // ─── HEADER ──────────────────────────────────────────────────
  r += `${doubleLine}\n`;
  r += `  ${t.reportHeader}\n`;
  r += `  ${hostname.toUpperCase()}\n`;
  r += `${doubleLine}\n\n`;

  // ─── 1. EXECUTIVE SUMMARY ──────────────────────────────────────
  r += `\ud83c\udfaf ${t.reportExecSummary}\n`;
  r += `${line}\n\n`;
  r += `  ${t.reportUrlAnalyzed} :     ${result.url}\n`;
  r += `  ${t.reportDateLabel} :             ${date}, ${time}\n`;
  r += `  ${t.reportGlobalScore} :     ${result.score}/100 (${result.grade})\n`;
  r += `  ${t.reportStatusLabel} :           ${sLabels[result.status]}\n`;
  r += `  ${t.reportResponseTimeLabel} : ${result.responseTime}ms\n`;
  r += `  ${t.reportHttps} :            ${result.tlsInfo.secure ? t.reportYes + " \u2705" : t.reportNo + " \u274c"}\n\n`;

  r += `  ${t.reportVulnBySeverity} :\n`;
  r += `  \ud83d\udd34 ${t.reportCriticalsLabel} : ${criticals.length}     \ud83d\udfe0 ${t.reportHighsLabel} : ${highs.length}\n`;
  r += `  \ud83d\udfe1 ${t.reportMediumsLabel} :  ${mediums.length}     \ud83d\udd35 ${t.reportLowsLabel} : ${lows.length}\n\n`;

  r += `  ${t.reportResultsSummary} : ${passes.length} \u2705  |  ${warns.length} \u26a0\ufe0f  |  ${fails.length} \u274c  (${result.checks.length} ${t.reportTests})\n\n`;

  // Top 5 actions
  const topActions = [...criticals, ...highs, ...mediums.filter((c) => c.status !== "pass")]
    .filter((c) => c.recommendation)
    .slice(0, 5);
  if (topActions.length > 0) {
    r += `  ${t.reportPriorityActions} :\n`;
    topActions.forEach((c, i) => {
      r += `  ${i + 1}. ${c.recommendation}\n`;
    });
    r += `\n`;
  }

  // Timeline
  if (criticals.length > 0) r += `  \u23f0 ${t.reportTimelineCritical}\n`;
  else if (highs.length > 0) r += `  \u23f0 ${t.reportTimelineHigh}\n`;
  else if (mediums.length > 0) r += `  \u23f0 ${t.reportTimelineMedium}\n`;
  else r += `  \u23f0 ${t.reportTimelineMaintenance}\n`;
  r += `\n`;

  // ─── 2. SCOPE & METHODOLOGY ─────────────────────────────────
  r += `\ud83d\udd0d ${t.reportScope}\n`;
  r += `${line}\n\n`;
  r += `  ${t.reportScopePerimeter} :\n`;
  r += `  \u2022 ${t.reportMainUrl} : ${result.url}\n`;
  r += `  \u2022 ${t.reportAnalysisType}\n`;
  r += `  \u2022 ${result.checks.length} ${t.reportAutomatedChecks}\n\n`;

  if (result.technologies.length > 0) {
    r += `  ${t.reportTechIdentified} :\n`;
    result.technologies.forEach((tech) => {
      r += `  \u2022 ${tech}\n`;
    });
    r += `\n`;
  }

  r += `  ${t.reportMethodsUsed} :\n`;
  r += `  \u2022 ${t.reportMethodHeaders}\n`;
  r += `  \u2022 ${t.reportMethodSsl}\n`;
  r += `  \u2022 ${t.reportMethodOwasp}\n`;
  r += `  \u2022 ${t.reportMethodDns}\n`;
  r += `  \u2022 ${t.reportMethodWaf}\n`;
  r += `  \u2022 ${t.reportMethodRgpd}\n`;
  r += `  \u2022 ${t.reportMethodHtml}\n`;
  r += `  \u2022 ${t.reportMethodMonitoring}\n\n`;

  r += `  ${t.reportStandards} :\n`;
  r += `  \u2022 OWASP Top 10 (2021)\n`;
  r += `  \u2022 RGPD / GDPR / AVG\n`;
  r += `  \u2022 RFC 9116 (security.txt)\n`;
  r += `  \u2022 Mozilla Observatory / Security Headers\n\n`;

  // ─── 3. CATEGORY SCORES ─────────────────────────────────
  r += `\ud83d\udcca ${t.reportCategoryScoresTitle}\n`;
  r += `${line}\n\n`;

  const maxLabelLen = Math.max(...result.categoryScores.map((cs) => cs.label.length));
  result.categoryScores.forEach((cs) => {
    const bar = "\u2588".repeat(Math.round(cs.score / 5)) + "\u2591".repeat(20 - Math.round(cs.score / 5));
    const pad = " ".repeat(maxLabelLen - cs.label.length);
    r += `  ${cs.label}${pad}  ${bar}  ${cs.score}/100 (${cs.grade})\n`;
  });

  const globalBar = "\u2588".repeat(Math.round(result.score / 5)) + "\u2591".repeat(20 - Math.round(result.score / 5));
  r += `  ${"\u2500".repeat(maxLabelLen + 30)}\n`;
  r += `  ${t.reportGlobalScoreLabel}${" ".repeat(Math.max(0, maxLabelLen - t.reportGlobalScoreLabel.length))}  ${globalBar}  ${result.score}/100 (${result.grade})\n\n`;

  // ─── 4. CRITICAL & HIGH VULNERABILITIES ───────────────────
  const urgent = [...criticals, ...highs];
  if (urgent.length > 0) {
    r += `\ud83d\udea8 ${t.reportCriticalVulns}\n`;
    r += `${line}\n`;
    urgent.forEach((c) => {
      const sev = c.severity === "critical" ? `\ud83d\udd34 ${t.reportSevCritical}` : `\ud83d\udfe0 ${t.reportSevHigh}`;
      r += `\n  ${sev}: ${c.name}\n`;
      r += `  \u251c\u2500 ${t.reportDescription} :    ${c.description}\n`;
      if (c.value) r += `  \u251c\u2500 ${t.reportValue} :        ${c.value}\n`;
      r += `  \u251c\u2500 ${t.pdfImpact} :        ${c.severity === "critical" ? t.reportImpactCritical : t.reportImpactHigh}\n`;
      r += `  \u251c\u2500 ${t.pdfCorrection} :    ${c.severity === "critical" ? t.reportFixCritical : t.reportFixHigh}\n`;
      if (c.recommendation) r += `  \u2514\u2500 ${t.reportRemediation} :   ${c.recommendation}\n`;
    });
    r += `\n`;
  } else {
    r += `\ud83d\udea8 ${t.reportCriticalVulns}\n`;
    r += `${line}\n\n`;
    r += `  \u2705 ${t.reportNoCriticalVulns}\n\n`;
  }

  // ─── 5. MEDIUM SEVERITY ALERTS ──────────────────────────
  const mediumFails = mediums.filter((c) => c.status !== "pass");
  if (mediumFails.length > 0) {
    r += `\u26a0\ufe0f ${t.reportMediumAlerts}\n`;
    r += `${line}\n`;
    mediumFails.forEach((c, i) => {
      r += `\n  ${i + 1}. \ud83d\udfe1 ${c.name}\n`;
      r += `     ${c.description}\n`;
      if (c.recommendation) r += `     \u2192 ${c.recommendation}\n`;
    });
    r += `\n`;
  } else {
    r += `\u26a0\ufe0f ${t.reportMediumAlerts}\n`;
    r += `${line}\n\n`;
    r += `  \u2705 ${t.reportNoMediumAlerts}\n\n`;
  }

  // ─── 6. RECOMMENDATIONS (LOW) ────────────────────────────
  const lowFails = lows.filter((c) => c.status !== "pass");
  if (lowFails.length > 0) {
    r += `\ud83d\udca1 ${t.reportRecommendationsLow}\n`;
    r += `${line}\n\n`;
    lowFails.forEach((c, i) => {
      r += `  ${i + 1}. ${c.name}\n`;
      r += `     ${c.description}\n`;
      if (c.recommendation) r += `     \u2192 ${c.recommendation}\n\n`;
    });
  }

  // ─── 7. DETAILED INVENTORY BY CATEGORY ────────────────────
  r += `\ud83d\udccb ${t.reportDetailedInventory}\n`;
  r += `${line}\n`;

  const grouped = result.checks.reduce(
    (acc, check) => {
      if (!acc[check.category]) acc[check.category] = [];
      acc[check.category].push(check);
      return acc;
    },
    {} as Record<string, AuditCheck[]>
  );

  Object.entries(grouped).forEach(([cat, checks]) => {
    const catScore = result.categoryScores.find((cs) => cs.category === cat);
    r += `\n  \u25a0 ${catScore?.label || cat.toUpperCase()}`;
    if (catScore) r += ` \u2014 ${catScore.score}/100 (${catScore.grade})`;
    r += `\n`;

    checks.forEach((c) => {
      const icon = c.status === "pass" ? "\u2705" : c.status === "fail" ? "\u274c" : c.status === "warn" ? "\u26a0\ufe0f" : "\u2139\ufe0f";
      r += `    ${icon} ${c.name}`;
      if (c.status !== "pass" && c.severity && c.severity !== "info") {
        const sevLabel =
          c.severity === "critical" ? `[${t.sevCritical}]` :
          c.severity === "high" ? `[${t.sevHigh}]` :
          c.severity === "medium" ? `[${t.sevMedium}]` : `[${t.sevLow}]`;
        r += ` ${sevLabel}`;
      }
      r += `\n`;
    });
  });
  r += `\n`;

  // ─── 8. POSITIVE POINTS ──────────────────────────────────
  if (passes.length > 0) {
    r += `\u2705 ${t.reportPositivePoints}\n`;
    r += `${line}\n\n`;
    passes.forEach((c) => {
      r += `  \u2022 ${c.name}\n`;
    });
    r += `\n`;
  }

  // ─── 9. REMEDIATION ROADMAP ───────────────────────────────
  r += `\ud83c\udfaf ${t.reportRoadmap}\n`;
  r += `${line}\n\n`;

  const immActions = urgent.filter((c) => c.recommendation);
  const shortActions = mediumFails.filter((c) => c.recommendation);
  const longActions = lowFails.filter((c) => c.recommendation);

  if (immActions.length > 0) {
    r += `  ${t.reportImmediateActions} :\n`;
    immActions.forEach((c, i) => {
      r += `  ${i + 1}. ${c.recommendation}\n`;
    });
    r += `\n`;
  }

  if (shortActions.length > 0) {
    r += `  ${t.reportShortTerm} :\n`;
    shortActions.forEach((c, i) => {
      r += `  ${i + 1}. ${c.recommendation}\n`;
    });
    r += `\n`;
  }

  if (longActions.length > 0) {
    r += `  ${t.reportLongTerm} :\n`;
    longActions.forEach((c, i) => {
      r += `  ${i + 1}. ${c.recommendation}\n`;
    });
    r += `\n`;
  }

  if (immActions.length === 0 && shortActions.length === 0 && longActions.length === 0) {
    r += `  \u2705 ${t.reportNoCorrectiveAction}\n`;
    r += `  ${t.reportMaintainWatch}\n\n`;
  }

  // ─── 10. CONCLUSION ──────────────────────────────────────
  r += `\ud83d\udcdd ${t.reportConclusion}\n`;
  r += `${line}\n\n`;

  if (result.score >= 85) {
    r += `  ${hostname} ${t.reportConclusionGoodStart} (${result.grade}, ${result.score}/100).\n`;
    r += `  ${t.reportConclusionGoodBody}\n\n`;
    r += `  ${t.reportConclusionGoodRec}\n`;
  } else if (result.score >= 60) {
    r += `  ${hostname} ${t.reportConclusionAcceptableStart}\n`;
    r += `  (${result.grade}, ${result.score}/100) ${t.reportConclusionAcceptableBody}\n\n`;
    r += `  ${t.reportConclusionAcceptableRec}\n`;
  } else if (result.score >= 40) {
    r += `  ${hostname} ${t.reportConclusionWeakStart}\n`;
    r += `  (${result.grade}, ${result.score}/100). ${t.reportConclusionWeakBody}\n\n`;
    r += `  ${t.reportConclusionWeakRec}\n`;
  } else {
    r += `  ${hostname} ${t.reportConclusionCriticalStart}\n`;
    r += `  (${result.grade}, ${result.score}/100). ${t.reportConclusionCriticalBody}\n\n`;
    r += `  ${t.reportConclusionCriticalRec}\n`;
  }

  r += `\n`;
  r += `${doubleLine}\n`;
  r += `  ${t.reportFooter}\n`;
  r += `  ${date}, ${time}\n`;
  r += `${doubleLine}\n`;

  return r;
}

function generatePDF(result: AuditResult, t: SecurityTranslations, dateLocale: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const hostname = new URL(result.url).hostname;
  const date = new Date(result.timestamp).toLocaleDateString(dateLocale, {
    day: "numeric", month: "long", year: "numeric",
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 0;
  const sLabels = getStatusLabels(t);

  const colors = {
    primary: [59, 130, 246] as [number, number, number],
    dark: [15, 23, 42] as [number, number, number],
    text: [51, 65, 85] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    green: [34, 197, 94] as [number, number, number],
    red: [239, 68, 68] as [number, number, number],
    orange: [249, 115, 22] as [number, number, number],
    yellow: [234, 179, 8] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    lightBg: [241, 245, 249] as [number, number, number],
  };

  function checkPage(needed: number) {
    if (y + needed > pageH - 20) {
      doc.setFontSize(7);
      doc.setTextColor(...colors.muted);
      doc.text("The Webmaster \u2014 Security Audit Report \u2014 " + hostname, pageW / 2, pageH - 10, { align: "center" });
      doc.addPage();
      y = 20;
    }
  }

  function sectionTitle(title: string) {
    checkPage(14);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.primary);
    doc.text(title, margin, y);
    y += 2;
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  }

  function bodyText(text: string, opts?: { bold?: boolean; color?: [number, number, number]; indent?: number }) {
    const indent = opts?.indent ?? 0;
    doc.setFontSize(9);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setTextColor(...(opts?.color ?? colors.text));
    const lines = doc.splitTextToSize(text, contentW - indent);
    for (const line of lines) {
      checkPage(5);
      doc.text(line, margin + indent, y);
      y += 4.2;
    }
  }

  // ─── COVER / HEADER ──────────────────────────────────────────
  doc.setFillColor(...colors.dark);
  doc.rect(0, 0, pageW, 58, "F");
  doc.setFillColor(...colors.primary);
  doc.rect(0, 58, pageW, 3, "F");

  doc.setTextColor(...colors.white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("THE WEBMASTER \u2014 SECURITY AUDIT TOOL", margin, 18);

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(t.pdfCoverTitle, margin, 33);

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(hostname.toUpperCase(), margin, 43);

  doc.setFontSize(9);
  doc.setTextColor(180, 200, 230);
  doc.text(date, margin, 52);

  y = 72;

  // ─── SCORE BOX ────────────────────────────────────────────────
  const gradeColor = result.score >= 85 ? colors.green : result.score >= 60 ? colors.yellow : colors.red;
  doc.setFillColor(...colors.lightBg);
  doc.roundedRect(margin, y, contentW, 28, 3, 3, "F");
  doc.setDrawColor(...gradeColor);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, contentW, 28, 3, 3, "S");

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...gradeColor);
  doc.text(result.grade, margin + 12, y + 18);

  doc.setFontSize(11);
  doc.setTextColor(...colors.dark);
  doc.text(`${result.score}/100`, margin + 30, y + 12);

  doc.setFontSize(9);
  doc.setTextColor(...colors.muted);
  doc.text(sLabels[result.status].replace(/[^\w\s\u00C0-\u00FF\u2014]/g, "").trim(), margin + 30, y + 20);

  // Counters
  const criticals = result.checks.filter(c => c.severity === "critical" && c.status === "fail");
  const highs = result.checks.filter(c => c.severity === "high" && c.status === "fail");
  const passes = result.checks.filter(c => c.status === "pass");
  const fails = result.checks.filter(c => c.status === "fail");
  const warns = result.checks.filter(c => c.status === "warn");

  const cx = margin + contentW - 70;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.green); doc.text(`${passes.length} OK`, cx, y + 10);
  doc.setTextColor(...colors.yellow); doc.text(`${warns.length} ${t.warnings}`, cx + 22, y + 10);
  doc.setTextColor(...colors.red); doc.text(`${fails.length} ${t.critical}`, cx + 48, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...colors.muted);
  doc.text(`${result.checks.length} tests | ${result.responseTime}ms`, cx, y + 19);

  y += 36;

  // ─── 1. EXECUTIVE SUMMARY ───────────────────────────────────────
  sectionTitle(t.pdfSummary);
  bodyText(`${t.pdfUrlAnalyzed} : ${result.url}`);
  bodyText(`${t.pdfGlobalScore} : ${result.score}/100 (${result.grade}) \u2014 ${sLabels[result.status].replace(/[^\w\s\u00C0-\u00FF\u2014]/g, "").trim()}`);
  bodyText(`${t.reportHttps} : ${result.tlsInfo.secure ? t.reportYes : t.reportNo} | ${t.pdfResponseTime} : ${result.responseTime}ms`);
  bodyText(`${t.pdfVulnerabilities} : ${criticals.length} ${t.pdfCritical}, ${highs.length} ${t.sevHigh}, ${warns.length} ${t.pdfWarnings}`);
  y += 3;

  const topActions = [...criticals, ...highs].filter(c => c.recommendation).slice(0, 5);
  if (topActions.length > 0) {
    bodyText(t.pdfTopActions + " :", { bold: true });
    topActions.forEach((c, i) => {
      bodyText(`${i + 1}. ${c.recommendation}`, { indent: 4 });
    });
    y += 2;
  }

  // ─── 2. SCOPE & METHODOLOGY ──────────────────────────────────
  sectionTitle(t.pdfScope);
  bodyText(`${t.reportScopePerimeter} : ${result.url} \u2014 ${t.reportAnalysisType}`);
  bodyText(`${result.checks.length} ${t.reportAutomatedChecks}`);
  if (result.technologies.length > 0) {
    bodyText(`${t.pdfTechDetectedLabel} : ${result.technologies.join(", ")}`);
  }
  bodyText(t.pdfStandards);
  y += 3;

  // ─── 3. CATEGORY SCORES ──────────────────────────────────
  sectionTitle(t.pdfCatScores);
  result.categoryScores.forEach(cs => {
    checkPage(8);
    const barWidth = contentW - 50;
    const filled = (cs.score / 100) * barWidth;
    const barColor = cs.score >= 85 ? colors.green : cs.score >= 60 ? colors.yellow : cs.score >= 40 ? colors.orange : colors.red;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.text);
    doc.text(cs.label, margin, y);

    doc.setFillColor(230, 230, 230);
    doc.roundedRect(margin + 55, y - 3, barWidth - 55, 4, 1, 1, "F");
    doc.setFillColor(...barColor);
    doc.roundedRect(margin + 55, y - 3, Math.max((filled - 55), 0), 4, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...barColor);
    doc.text(`${cs.score}/100 (${cs.grade})`, pageW - margin, y, { align: "right" });
    y += 7;
  });
  y += 3;

  // ─── 4. CRITICAL & HIGH VULNERABILITIES ────────────────────
  const urgent = [...criticals, ...highs];
  sectionTitle(t.pdfCritVulns);
  if (urgent.length === 0) {
    bodyText(t.pdfNoCritVulns, { color: colors.green });
    y += 3;
  } else {
    urgent.forEach(c => {
      const sevColor = c.severity === "critical" ? colors.red : colors.orange;
      const sevLabel = c.severity === "critical" ? t.sevCritical : t.sevHigh;
      bodyText(`[${sevLabel}] ${c.name}`, { bold: true, color: sevColor });
      bodyText(c.description, { indent: 4 });
      if (c.value) bodyText(`${t.reportValue} : ${c.value}`, { indent: 4, color: colors.muted });
      if (c.recommendation) bodyText(`${t.reportRemediation} : ${c.recommendation}`, { indent: 4, color: colors.primary });
      y += 2;
    });
  }

  // ─── 5. MEDIUM SEVERITY ALERTS ──────────────────────────────
  const mediums = result.checks.filter(c => c.severity === "medium" && c.status !== "pass");
  sectionTitle(t.pdfMedAlerts);
  if (mediums.length === 0) {
    bodyText(t.pdfNoMedAlerts, { color: colors.green });
    y += 3;
  } else {
    mediums.forEach((c, i) => {
      bodyText(`${i + 1}. ${c.name}`, { bold: true });
      bodyText(c.description, { indent: 4 });
      if (c.recommendation) bodyText(`\u2192 ${c.recommendation}`, { indent: 4, color: colors.primary });
      y += 1;
    });
    y += 2;
  }

  // ─── 6. RECOMMENDATIONS ───────────────────────────────────
  const lows = result.checks.filter(c => c.severity === "low" && c.status !== "pass");
  sectionTitle(t.pdfLowRecs);
  if (lows.length === 0) {
    bodyText(t.pdfNoLowRecs, { color: colors.green });
    y += 3;
  } else {
    lows.forEach((c, i) => {
      bodyText(`${i + 1}. ${c.name} \u2014 ${c.description}`, { indent: 0 });
      if (c.recommendation) bodyText(`\u2192 ${c.recommendation}`, { indent: 4, color: colors.primary });
      y += 1;
    });
    y += 2;
  }

  // ─── 7. DETAILED INVENTORY ───────────────────────────────────
  sectionTitle(t.pdfDetailedInventory);
  const grouped = result.checks.reduce((acc, check) => {
    if (!acc[check.category]) acc[check.category] = [];
    acc[check.category].push(check);
    return acc;
  }, {} as Record<string, AuditCheck[]>);

  Object.entries(grouped).forEach(([cat, checks]) => {
    const catScore = result.categoryScores.find(cs => cs.category === cat);
    checkPage(8);
    bodyText(`${catScore?.label || cat} \u2014 ${catScore?.score ?? "?"}/100 (${catScore?.grade ?? "?"})`, { bold: true });
    checks.forEach(c => {
      const icon = c.status === "pass" ? "[OK]" : c.status === "fail" ? "[FAIL]" : c.status === "warn" ? "[WARN]" : "[INFO]";
      const iconColor = c.status === "pass" ? colors.green : c.status === "fail" ? colors.red : c.status === "warn" ? colors.yellow : colors.muted;
      bodyText(`  ${icon} ${c.name}`, { color: iconColor, indent: 4 });
    });
    y += 2;
  });

  // ─── 8. POSITIVE FINDINGS ───────────────────────────────────
  if (passes.length > 0) {
    sectionTitle(t.pdfPositivePoints);
    passes.forEach(c => {
      bodyText(`\u2022 ${c.name}`, { color: colors.green });
    });
    y += 3;
  }

  // ─── 9. ROADMAP ───────────────────────────────────────────────
  sectionTitle(t.pdfRoadmap);
  const immActions = urgent.filter(c => c.recommendation);
  const shortActions = mediums.filter(c => c.recommendation);
  const longActions = lows.filter(c => c.recommendation);

  if (immActions.length > 0) {
    bodyText(t.pdfImmActions, { bold: true, color: colors.red });
    immActions.forEach((c, i) => bodyText(`${i + 1}. ${c.recommendation}`, { indent: 4 }));
    y += 2;
  }
  if (shortActions.length > 0) {
    bodyText(t.pdfShortTerm, { bold: true, color: colors.orange });
    shortActions.forEach((c, i) => bodyText(`${i + 1}. ${c.recommendation}`, { indent: 4 }));
    y += 2;
  }
  if (longActions.length > 0) {
    bodyText(t.pdfLongTerm, { bold: true, color: colors.muted });
    longActions.forEach((c, i) => bodyText(`${i + 1}. ${c.recommendation}`, { indent: 4 }));
    y += 2;
  }
  if (immActions.length === 0 && shortActions.length === 0 && longActions.length === 0) {
    bodyText(t.pdfNoCorrectiveAction, { color: colors.green });
    y += 3;
  }

  // ─── 10. CONCLUSION ───────────────────────────────────────────
  sectionTitle(t.pdfConclusionTitle);
  if (result.score >= 85) {
    bodyText(`${hostname} ${t.pdfConclusionGood} (${result.grade}, ${result.score}/100).`);
    bodyText(t.pdfConclusionGoodRec);
  } else if (result.score >= 60) {
    bodyText(`${hostname} ${t.pdfConclusionAcceptable} (${result.grade}, ${result.score}/100) ${t.pdfConclusionAcceptableBody}`);
    bodyText(t.pdfConclusionAcceptableRec);
  } else if (result.score >= 40) {
    bodyText(`${hostname} ${t.pdfConclusionWeak} (${result.grade}, ${result.score}/100). ${t.pdfConclusionWeakBody}`);
    bodyText(t.pdfConclusionWeakRec);
  } else {
    bodyText(`${hostname} ${t.pdfConclusionCritical} (${result.grade}, ${result.score}/100). ${t.pdfConclusionCriticalBody}`);
    bodyText(t.pdfConclusionCriticalRec, { bold: true, color: colors.red });
  }

  // ─── FOOTER (last page) ───────────────────────────────────────
  y += 10;
  checkPage(20);
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(...colors.muted);
  doc.text(t.pdfFooter, margin, y);
  y += 4;
  doc.text(date, margin, y);

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...colors.muted);
    doc.text(`Page ${i}/${totalPages}`, pageW - margin, pageH - 10, { align: "right" });
    if (i > 1) {
      doc.text("The Webmaster \u2014 Security Audit Report \u2014 " + hostname, pageW / 2, pageH - 10, { align: "center" });
    }
  }

  doc.save(`audit-securite-${hostname}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function AuditReport({ result, t, dateLocale }: { result: AuditResult; t: SecurityTranslations; dateLocale: string }) {
  const [copied, setCopied] = useState(false);
  const report = generateReportText(result, t, dateLocale);

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-card/50 overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold">{t.reportAuditTitle}</h3>
            <p className="text-xs text-muted-foreground">
              {t.reportAuditSubtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => generatePDF(result, t, dateLocale)} className="gap-2">
            <Download className="w-4 h-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                {t.copied}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                {t.copy}
              </>
            )}
          </Button>
        </div>
      </div>
      <pre className="p-5 text-xs leading-relaxed text-foreground/90 overflow-x-auto whitespace-pre-wrap font-mono bg-muted/20 max-h-[600px] overflow-y-auto">
        {report}
      </pre>
    </div>
  );
}

export default function SecurityAuditClient({ locale = "fr" }: { locale?: string }) {
  const t = translations[locale as keyof typeof translations] || translations.fr;
  const dateLocale = getDateLocale(locale);
  const categoryLabels = getCategoryLabels(t);
  const statusCfg = getStatusConfig(t);

  const [url, setUrl] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("audit-unlocked-security") === "true";
    }
    return false;
  });

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setStatus("loading");
    setResult(null);
    setErrorMsg("");
    setUnlocked(false);
    sessionStorage.removeItem("audit-unlocked-security");

    try {
      const res = await fetch("/api/security-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.errorUnknown);

      setResult(data);
      setStatus("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t.errorOccurred);
      setStatus("error");
    }
  };

  // Group checks by category
  const grouped = result?.checks.reduce(
    (acc, check) => {
      const cat = check.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(check);
      return acc;
    },
    {} as Record<string, AuditCheck[]>
  );

  const summary = result
    ? {
        pass: result.checks.filter((c) => c.status === "pass").length,
        warn: result.checks.filter((c) => c.status === "warn").length,
        fail: result.checks.filter((c) => c.status === "fail").length,
        info: result.checks.filter((c) => c.status === "info").length,
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            The<span className="text-primary">Webmaster</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-primary" />
            {t.toolName}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            {t.title} <span className="text-primary">{t.titleHighlight}</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleAudit} className="max-w-2xl mx-auto mb-12">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t.placeholder}
                className="w-full h-12 pl-12 pr-4 rounded-xl border bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                disabled={status === "loading"}
              />
            </div>
            <Button type="submit" size="lg" className="h-12 px-6" disabled={status === "loading"}>
              {status === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.analyzing}
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  {t.analyze}
                </>
              )}
            </Button>
          </div>
          {status === "error" && (
            <p className="text-sm text-red-500 mt-3 text-center">{errorMsg}</p>
          )}
        </form>

        {/* Loading animation */}
        {status === "loading" && (
          <div className="text-center py-20">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-muted/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <Shield className="absolute inset-0 m-auto w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground animate-pulse">
              {t.loadingText}
            </p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-8">
            {/* Score + Summary */}
            <div className="p-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <ScoreRing score={result.score} grade={result.grade} />
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-xl font-bold mb-1">{t.resultTitle}</h2>
                  <p className="text-sm text-muted-foreground mb-4 break-all">{result.url}</p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    {summary &&
                      (
                        [
                          ["pass", summary.pass, t.passed],
                          ["warn", summary.warn, t.warnings],
                          ["fail", summary.fail, t.critical],
                          ["info", summary.info, t.infos],
                        ] as const
                      ).map(([key, count, label]) => {
                        const conf = statusCfg[key];
                        return (
                          <div
                            key={key}
                            className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm", conf.bg)}
                          >
                            <conf.icon className={cn("w-4 h-4", conf.color)} />
                            <span className="font-semibold">{count}</span>
                            <span className="text-muted-foreground">{label}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            {/* Unlock Gate or Full Results */}
            {!unlocked ? (
              <UnlockGate
                t={t}
                siteUrl={result.url}
                auditType="security"
                score={result.score}
                grade={result.grade}
                locale={locale}
                onUnlocked={() => setUnlocked(true)}
              />
            ) : (
            <>
            {/* Technologies */}
            {result.technologies.length > 0 && (
              <div className="p-6 rounded-2xl border border-border/50 bg-card/50">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">{t.technologiesDetected}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Checks by category */}
            {grouped &&
              Object.entries(grouped).map(([category, checks]) => {
                const catInfo = categoryLabels[category] || {
                  label: category,
                  icon: Shield,
                };
                const CatIcon = catInfo.icon;
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <CatIcon className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">{catInfo.label}</h3>
                      <span className="text-xs text-muted-foreground">
                        ({checks.length} {checks.length > 1 ? t.verifications : t.verification})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {checks.map((check) => (
                        <CheckCard key={check.id} check={check} t={t} />
                      ))}
                    </div>
                  </div>
                );
              })}

            {/* Auto-generated Report */}
            <AuditReport result={result} t={t} dateLocale={dateLocale} />
            </>
            )}

            {/* Disclaimer */}
            <div className="p-4 rounded-xl border border-border/30 bg-muted/20 text-center">
              <p className="text-xs text-muted-foreground">
                {t.disclaimer}
                {" "}
                {t.analyzedOn} {new Date(result.timestamp).toLocaleString(dateLocale)} — {t.responseTimeLabel} : {result.responseTime}ms
              </p>
            </div>
          </div>
        )}

        {/* Other tools */}
        <div className="mt-12 pt-8 border-t border-border/30">
          <h3 className="text-lg font-semibold text-center mb-6">{t.otherTools}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <Link
              href={`/${locale}/seo-audit`}
              className="p-5 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Search className="w-5 h-5 text-primary" />
                <span className="font-semibold group-hover:text-primary transition-colors">{t.seoAudit}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t.seoAuditDesc}</p>
            </Link>
            <Link
              href={`/${locale}/performance-audit`}
              className="p-5 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Gauge className="w-5 h-5 text-primary" />
                <span className="font-semibold group-hover:text-primary transition-colors">{t.perfAudit}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t.perfAuditDesc}</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
