"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Loader2,
  ChevronDown,
  ChevronUp,
  Cpu,
  FileText,
  Copy,
  Check,
  BarChart3,
  Link2,
  Image,
  Heading,
  Tag,
  Zap,
  Share2,
  Settings,
  Eye,
  ExternalLink,
  ArrowUpRight,
  TrendingUp,
  FileSearch,
  Layers,
  MonitorSmartphone,
  ShieldCheck,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { translations, type SeoTranslations, getDateLocale } from "./translations";
import UnlockGate from "@/components/UnlockGate";

interface SeoCheck {
  id: string;
  category: string;
  name: string;
  status: "pass" | "warn" | "fail" | "info";
  severity?: "critical" | "high" | "medium" | "low" | "info";
  description: string;
  value?: string;
  recommendation?: string;
}

interface SeoAuditResult {
  url: string;
  timestamp: string;
  score: number;
  grade: string;
  checks: SeoCheck[];
  responseTime: number;
  pageSize: number;
  meta: {
    title: string | null;
    description: string | null;
    canonical: string | null;
    ogImage: string | null;
    language: string | null;
  };
  headings: { tag: string; text: string }[];
  links: { internal: number; external: number; broken: number };
  images: { total: number; withAlt: number; withoutAlt: number };
  technologies: string[];
}

function getCategoryLabels(t: SeoTranslations) {
  return {
    technical: { label: t.catTechnical, icon: Settings },
    onpage: { label: t.catOnpage, icon: FileSearch },
    performance: { label: t.catPerformance, icon: Zap },
    offpage: { label: t.catOffpage, icon: Share2 },
  } as Record<string, { label: string; icon: typeof Search }>;
}

function getStatusConfig(t: SeoTranslations) {
  return {
    pass: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: t.statusOk },
    warn: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10", label: t.statusWarn },
    fail: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: t.statusFail },
    info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", label: t.statusInfo },
  };
}

function getSeverityConfig(t: SeoTranslations) {
  return {
    critical: { label: t.sevCritical, color: "text-red-600 bg-red-500/15 border-red-500/30" },
    high: { label: t.sevHigh, color: "text-orange-500 bg-orange-500/15 border-orange-500/30" },
    medium: { label: t.sevMedium, color: "text-yellow-500 bg-yellow-500/15 border-yellow-500/30" },
    low: { label: t.sevLow, color: "text-blue-400 bg-blue-400/15 border-blue-400/30" },
  } as Record<string, { label: string; color: string }>;
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

function CheckCard({ check, t }: { check: SeoCheck; t: SeoTranslations }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = getStatusConfig(t);
  const config = statusCfg[check.status];
  const StatusIcon = config.icon;
  const sevCfg = getSeverityConfig(t);
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
              <code className="text-xs bg-muted/50 px-2 py-1 rounded block break-all">
                {check.value}
              </code>
            </div>
          )}
          {check.recommendation && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.recommendationLabel}</p>
              <p className="text-xs text-primary">{check.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetaPreview({ meta, url, t }: { meta: SeoAuditResult["meta"]; url: string; t: SeoTranslations }) {
  const displayUrl = (() => {
    try {
      const u = new URL(url);
      return `${u.hostname}${u.pathname === "/" ? "" : u.pathname}`;
    } catch {
      return url;
    }
  })();

  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/50">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">{t.serpPreview}</h3>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-border/30 max-w-2xl">
        <p className="text-sm text-green-700 dark:text-green-400 mb-1 truncate">{displayUrl}</p>
        <p className="text-lg text-blue-600 dark:text-blue-400 font-medium mb-1 line-clamp-1 hover:underline cursor-pointer">
          {meta.title || t.missingTitle}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
          {meta.description || t.missingDescription}
        </p>
      </div>
    </div>
  );
}

function HeadingStructure({ headings, t }: { headings: { tag: string; text: string }[]; t: SeoTranslations }) {
  if (headings.length === 0) return null;

  const indentMap: Record<string, string> = {
    H1: "ml-0",
    H2: "ml-4",
    H3: "ml-8",
    H4: "ml-12",
    H5: "ml-16",
    H6: "ml-20",
  };

  const tagColors: Record<string, string> = {
    H1: "bg-primary/20 text-primary",
    H2: "bg-blue-500/15 text-blue-500",
    H3: "bg-cyan-500/15 text-cyan-500",
    H4: "bg-teal-500/15 text-teal-500",
    H5: "bg-green-500/15 text-green-500",
    H6: "bg-emerald-500/15 text-emerald-500",
  };

  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/50">
      <div className="flex items-center gap-2 mb-4">
        <Heading className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">{t.headingStructure}</h3>
        <span className="text-xs text-muted-foreground">({headings.length} {t.headingsCount})</span>
      </div>
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {headings.map((h, i) => (
          <div key={i} className={cn("flex items-center gap-2", indentMap[h.tag] || "ml-0")}>
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", tagColors[h.tag] || "bg-muted")}>
              {h.tag}
            </span>
            <span className="text-sm truncate">{h.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickStats({ responseTime, pageSize, links, images, t }: { responseTime: number; pageSize: number; links: SeoAuditResult["links"]; images: SeoAuditResult["images"]; t: SeoTranslations }) {
  const stats = [
    {
      icon: Zap,
      label: t.ttfb,
      value: `${responseTime}ms`,
      color: responseTime < 800 ? "text-green-500" : responseTime < 1800 ? "text-yellow-500" : "text-red-500",
    },
    {
      icon: FileText,
      label: t.htmlSize,
      value: `${Math.round(pageSize / 1024)} KB`,
      color: pageSize < 102400 ? "text-green-500" : "text-yellow-500",
    },
    {
      icon: Link2,
      label: t.internalLinks,
      value: `${links.internal}`,
      color: links.internal > 3 ? "text-green-500" : "text-yellow-500",
    },
    {
      icon: ExternalLink,
      label: t.externalLinks,
      value: `${links.external}`,
      color: "text-blue-500",
    },
    {
      icon: Image,
      label: t.images,
      value: `${images.total}`,
      color: images.withoutAlt === 0 ? "text-green-500" : "text-yellow-500",
    },
    {
      icon: Tag,
      label: t.imagesNoAlt,
      value: `${images.withoutAlt}`,
      color: images.withoutAlt === 0 ? "text-green-500" : "text-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="p-3 rounded-xl border border-border/50 bg-card/50 text-center">
          <stat.icon className={cn("w-5 h-5 mx-auto mb-1", stat.color)} />
          <p className={cn("text-lg font-bold", stat.color)}>{stat.value}</p>
          <p className="text-[11px] text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

function generateSeoReportText(result: SeoAuditResult) {
  const quickWins = result.checks.filter(
    (c) => c.status === "fail" && (c.severity === "critical" || c.severity === "high")
  );
  const warnings = result.checks.filter(
    (c) => c.status === "warn" && (c.severity === "medium" || c.severity === "high")
  );
  const improvements = result.checks.filter(
    (c) => (c.status === "warn" || c.status === "fail") && c.severity === "low"
  );

  return { quickWins, warnings, improvements };
}

function generatePDF(result: SeoAuditResult, t: SeoTranslations, dateLocale: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const marginL = 20;
  const marginR = 20;
  const maxW = W - marginL - marginR;
  let y = 20;

  const hostname = (() => {
    try { return new URL(result.url).hostname; } catch { return result.url; }
  })();
  const date = new Date(result.timestamp).toLocaleDateString(dateLocale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const time = new Date(result.timestamp).toLocaleTimeString(dateLocale, {
    hour: "2-digit", minute: "2-digit",
  });

  const addPage = () => { doc.addPage(); y = 20; };
  const checkSpace = (need: number) => { if (y + need > H - 20) addPage(); };

  const drawLine = (yPos: number, color = [220, 220, 220]) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.3);
    doc.line(marginL, yPos, W - marginR, yPos);
  };

  const writeWrapped = (text: string, x: number, fontSize: number, color: [number, number, number] = [60, 60, 60], style: "normal" | "bold" = "normal") => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont("helvetica", style);
    const lines = doc.splitTextToSize(text, maxW - (x - marginL));
    for (const line of lines) {
      checkSpace(fontSize * 0.5);
      doc.text(line, x, y);
      y += fontSize * 0.45;
    }
  };

  // ─── HEADER ──────────────────────────────────────────────
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, W, 45, "F");

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(t.pdfTitle, marginL, 18);

  doc.setFontSize(12);
  doc.setTextColor(180, 180, 255);
  doc.text(hostname.toUpperCase(), marginL, 27);

  doc.setFontSize(9);
  doc.setTextColor(160, 160, 160);
  doc.text(`${date}, ${time}`, marginL, 35);

  // Score badge
  const scoreColor: [number, number, number] = result.score >= 85 ? [34, 197, 94] : result.score >= 60 ? [234, 179, 8] : [239, 68, 68];
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.roundedRect(W - marginR - 35, 10, 35, 25, 4, 4, "F");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(result.grade, W - marginR - 26, 22);
  doc.setFontSize(9);
  doc.text(`${result.score}/100`, W - marginR - 30, 30);

  y = 55;

  // ─── 1. RESUME EXECUTIF ────────────────────────────────────
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.text(t.pdfSummary, marginL, y);
  y += 8;
  drawLine(y);
  y += 6;

  const passes = result.checks.filter((c) => c.status === "pass").length;
  const warns = result.checks.filter((c) => c.status === "warn").length;
  const fails = result.checks.filter((c) => c.status === "fail").length;

  const summaryItems = [
    [t.pdfUrlAnalyzed, result.url],
    [t.pdfGlobalScore, `${result.score}/100 (${result.grade})`],
    [t.pdfResponseTime, `${result.responseTime}ms`],
    [t.pdfHtmlSize, `${Math.round(result.pageSize / 1024)} KB`],
    [t.pdfResults, `${passes} ${t.pdfPassed} | ${warns} ${t.pdfWarnings} | ${fails} ${t.pdfCritical}`],
  ];
  for (const [label, value] of summaryItems) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(`${label} :`, marginL + 2, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(value, marginL + 48, y);
    y += 5;
  }
  y += 4;

  // ─── 2. META DONNEES ──────────────────────────────────────
  checkSpace(40);
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.text(t.pdfMeta, marginL, y);
  y += 8;
  drawLine(y);
  y += 6;

  const metaItems = [
    ["Title", result.meta.title || t.pdfMissing],
    ["Description", result.meta.description || t.pdfMissingFem],
    ["Canonical", result.meta.canonical || t.pdfAbsent],
    ["Langue", result.meta.language || t.pdfUndefined],
    ["OG Image", result.meta.ogImage ? t.pdfPresent : t.pdfAbsent],
  ];
  for (const [label, value] of metaItems) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(`${label} :`, marginL + 2, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    const truncated = value.length > 80 ? value.substring(0, 77) + "..." : value;
    doc.text(truncated, marginL + 35, y);
    y += 5;
  }
  y += 4;

  // ─── 3. STATISTIQUES ──────────────────────────────────────
  checkSpace(35);
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.text(t.pdfStats, marginL, y);
  y += 8;
  drawLine(y);
  y += 6;

  const statsItems = [
    [t.pdfInternalLinks, `${result.links.internal}`],
    [t.pdfExternalLinks, `${result.links.external}`],
    [t.pdfTotalImages, `${result.images.total}`],
    [t.pdfImagesNoAlt, `${result.images.withoutAlt}`],
  ];
  for (const [label, value] of statsItems) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(`${label} :`, marginL + 2, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(value, marginL + 40, y);
    y += 5;
  }
  y += 4;

  // ─── 4. RESULTATS PAR CATEGORIE ───────────────────────────
  checkSpace(20);
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.text(t.pdfResultsByCategory, marginL, y);
  y += 8;
  drawLine(y);
  y += 6;

  const catOrder = ["technical", "onpage", "performance", "offpage"];
  const catLabelsMap = {
    technical: t.catTechnical,
    onpage: t.catOnpage,
    performance: t.catPerformance,
    offpage: t.catOffpage,
  } as Record<string, string>;

  for (const catKey of catOrder) {
    const catChecks = result.checks.filter((c) => c.category === catKey);
    if (catChecks.length === 0) continue;

    checkSpace(15);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text(`${catLabelsMap[catKey]} (${catChecks.length} ${t.verifications})`, marginL + 2, y);
    y += 6;

    for (const check of catChecks) {
      checkSpace(12);
      const icon = check.status === "pass" ? "[OK]" : check.status === "fail" ? "[KO]" : check.status === "warn" ? "[!!]" : "[i]";
      const iconColor: [number, number, number] =
        check.status === "pass" ? [34, 197, 94] :
        check.status === "fail" ? [239, 68, 68] :
        check.status === "warn" ? [234, 179, 8] : [59, 130, 246];

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(iconColor[0], iconColor[1], iconColor[2]);
      doc.text(icon, marginL + 4, y);

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text(check.name, marginL + 15, y);

      if (check.severity && check.severity !== "info" && check.status !== "pass") {
        const sevLabel = check.severity.toUpperCase();
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(iconColor[0], iconColor[1], iconColor[2]);
        doc.text(`[${sevLabel}]`, marginL + 15 + doc.getTextWidth(check.name) + 2, y);
      }

      y += 4;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const descLines = doc.splitTextToSize(check.description, maxW - 17);
      for (const line of descLines) {
        checkSpace(4);
        doc.text(line, marginL + 15, y);
        y += 3.5;
      }

      if (check.recommendation) {
        checkSpace(4);
        doc.setTextColor(59, 130, 246);
        doc.setFontSize(7.5);
        const recLines = doc.splitTextToSize(`${t.pdfRecommendation} : ${check.recommendation}`, maxW - 17);
        for (const line of recLines) {
          checkSpace(4);
          doc.text(line, marginL + 15, y);
          y += 3.5;
        }
      }
      y += 2;
    }
    y += 3;
  }

  // ─── 5. QUICK WINS ────────────────────────────────────────
  const { quickWins, warnings, improvements } = generateSeoReportText(result);

  if (quickWins.length > 0) {
    checkSpace(20);
    doc.setFontSize(14);
    doc.setTextColor(239, 68, 68);
    doc.setFont("helvetica", "bold");
    doc.text(t.pdfQuickWins, marginL, y);
    y += 8;
    drawLine(y, [239, 68, 68]);
    y += 6;

    for (const c of quickWins) {
      checkSpace(10);
      writeWrapped(`${c.name}`, marginL + 4, 9, [239, 68, 68], "bold");
      y += 1;
      writeWrapped(c.recommendation || c.description, marginL + 4, 8, [80, 80, 80]);
      y += 3;
    }
    y += 2;
  }

  if (warnings.length > 0) {
    checkSpace(20);
    doc.setFontSize(14);
    doc.setTextColor(234, 179, 8);
    doc.setFont("helvetica", "bold");
    doc.text(t.pdfRecommended, marginL, y);
    y += 8;
    drawLine(y, [234, 179, 8]);
    y += 6;

    for (const c of warnings) {
      checkSpace(10);
      writeWrapped(`${c.name}`, marginL + 4, 9, [234, 179, 8], "bold");
      y += 1;
      writeWrapped(c.recommendation || c.description, marginL + 4, 8, [80, 80, 80]);
      y += 3;
    }
    y += 2;
  }

  if (improvements.length > 0) {
    checkSpace(20);
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.setFont("helvetica", "bold");
    doc.text(t.pdfMinor, marginL, y);
    y += 8;
    drawLine(y, [59, 130, 246]);
    y += 6;

    for (const c of improvements) {
      checkSpace(10);
      writeWrapped(`${c.name}`, marginL + 4, 9, [59, 130, 246], "bold");
      y += 1;
      writeWrapped(c.recommendation || c.description, marginL + 4, 8, [80, 80, 80]);
      y += 3;
    }
    y += 2;
  }

  // ─── TECHNOLOGIES ──────────────────────────────────────────
  if (result.technologies.length > 0) {
    checkSpace(20);
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.text(t.pdfTechDetected, marginL, y);
    y += 8;
    drawLine(y);
    y += 6;

    writeWrapped(result.technologies.join(", "), marginL + 2, 9, [60, 60, 60]);
    y += 4;
  }

  // ─── FOOTER on every page ─────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${t.reportTitle} - ${hostname} - ${date} - Page ${i}/${totalPages}`,
      marginL,
      H - 10
    );
    doc.text("The Webmaster - " + t.toolName, W - marginR - 50, H - 10);
  }

  doc.save(`seo-audit-${hostname}-${new Date().toISOString().split("T")[0]}.pdf`);
}

function SeoReport({ result, t, dateLocale }: { result: SeoAuditResult; t: SeoTranslations; dateLocale: string }) {
  const [copied, setCopied] = useState(false);
  const { quickWins, warnings, improvements } = generateSeoReportText(result);

  const reportText = `${t.reportTitle}
${"=".repeat(50)}
${t.reportSite} : ${result.url}
Date : ${new Date(result.timestamp).toLocaleString(dateLocale)}
${t.reportScore} : ${result.score}/100 (${result.grade})
${t.reportResponseTime} : ${result.responseTime}ms
${t.reportHtmlSize} : ${Math.round(result.pageSize / 1024)} KB

${t.reportSummary}
------
- ${result.checks.filter((c) => c.status === "pass").length} ${t.reportTestsPassed}
- ${result.checks.filter((c) => c.status === "warn").length} ${t.reportAlerts}
- ${result.checks.filter((c) => c.status === "fail").length} ${t.reportCriticalIssues}

${t.reportMeta}
------------
${t.reportTitle2} : ${result.meta.title || "MANQUANT"}
${t.reportDescription} : ${result.meta.description || "MANQUANTE"}
${t.reportCanonical} : ${result.meta.canonical || "ABSENTE"}
${t.reportLanguage} : ${result.meta.language || "NON DEFINIE"}

${t.reportStats}
------------
${t.pdfInternalLinks} : ${result.links.internal}
${t.pdfExternalLinks} : ${result.links.external}
${t.pdfTotalImages} : ${result.images.total}
${t.pdfImagesNoAlt} : ${result.images.withoutAlt}

${quickWins.length > 0 ? `${t.reportQuickWins}\n${"-".repeat(30)}\n${quickWins.map((c) => `- [${c.severity?.toUpperCase()}] ${c.name}: ${c.recommendation || c.description}`).join("\n")}\n` : ""}
${warnings.length > 0 ? `${t.reportRecommended}\n${"-".repeat(30)}\n${warnings.map((c) => `- [${c.severity?.toUpperCase()}] ${c.name}: ${c.recommendation || c.description}`).join("\n")}\n` : ""}
${improvements.length > 0 ? `${t.reportMinor}\n${"-".repeat(30)}\n${improvements.map((c) => `- ${c.name}: ${c.recommendation || c.description}`).join("\n")}\n` : ""}
${t.reportTechDetected}
${"-".repeat(30)}
${result.technologies.join(", ") || t.reportNone}

---
Genere par TheWebmaster {t.toolName}
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">{t.prioritizedRecs}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? t.copied : t.copy}
          </Button>
          <Button size="sm" onClick={() => generatePDF(result, t, dateLocale)} className="gap-2">
            <Download className="w-4 h-4" />
            {t.downloadPdf}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {quickWins.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <h4 className="font-semibold text-sm text-red-500">{t.quickWinsTitle}</h4>
            </div>
            <div className="space-y-2">
              {quickWins.map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <ArrowUpRight className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.recommendation || c.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <h4 className="font-semibold text-sm text-yellow-500">{t.recommendedTitle}</h4>
            </div>
            <div className="space-y-2">
              {warnings.map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                  <TrendingUp className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.recommendation || c.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {improvements.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <h4 className="font-semibold text-sm text-blue-500">{t.minorTitle}</h4>
            </div>
            <div className="space-y-2">
              {improvements.map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <Layers className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.recommendation || c.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {quickWins.length === 0 && warnings.length === 0 && improvements.length === 0 && (
          <div className="text-center py-6">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t.excellent}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SeoAuditClient({ locale = "fr" }: { locale?: string }) {
  const t = translations[locale as keyof typeof translations] || translations.fr;
  const dateLocale = getDateLocale(locale);
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<SeoAuditResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("audit-unlocked-seo") === "true";
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
    sessionStorage.removeItem("audit-unlocked-seo");

    try {
      const res = await fetch("/api/seo-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur inconnue");

      setResult(data);
      setStatus("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Une erreur est survenue");
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
    {} as Record<string, SeoCheck[]>
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
            <BarChart3 className="w-4 h-4 text-primary" />
            {t.toolName}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Search className="w-8 h-8 text-primary" />
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
              <Search className="absolute inset-0 m-auto w-8 h-8 text-primary" />
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
                        const sc = getStatusConfig(t);
                        const conf = sc[key];
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
                auditType="seo"
                score={result.score}
                grade={result.grade}
                locale={locale}
                onUnlocked={() => setUnlocked(true)}
              />
            ) : (
            <>
            {/* Quick Stats */}
            <QuickStats responseTime={result.responseTime} pageSize={result.pageSize} links={result.links} images={result.images} t={t} />

            {/* SERP Preview */}
            <MetaPreview meta={result.meta} url={result.url} t={t} />

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

            {/* Heading Structure */}
            <HeadingStructure headings={result.headings} t={t} />

            {/* Checks by category */}
            {grouped &&
              ["technical", "onpage", "performance", "offpage"].map((categoryKey) => {
                const checks = grouped[categoryKey];
                if (!checks) return null;
                const catLabels = getCategoryLabels(t);
                const catInfo = catLabels[categoryKey] || {
                  label: categoryKey,
                  icon: Search,
                };
                const CatIcon = catInfo.icon;
                return (
                  <div key={categoryKey}>
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

            {/* Recommendations Report */}
            <SeoReport result={result} t={t} dateLocale={dateLocale} />
            </>
            )}

            {/* Disclaimer */}
            <div className="p-4 rounded-xl border border-border/30 bg-muted/20 text-center">
              <p className="text-xs text-muted-foreground">
                {t.disclaimer}
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
              href={`/${locale}/performance-audit`}
              className="p-5 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-primary" />
                <span className="font-semibold group-hover:text-primary transition-colors">{t.perfAudit}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t.perfAuditDesc}</p>
            </Link>
            <Link
              href={`/${locale}/security-audit`}
              className="p-5 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span className="font-semibold group-hover:text-primary transition-colors">{t.secAudit}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t.secAuditDesc}</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
