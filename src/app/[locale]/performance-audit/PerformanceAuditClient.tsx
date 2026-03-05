"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Gauge,
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
  Zap,
  Server,
  Image,
  Type,
  Layers,
  Rocket,
  Activity,
  Timer,
  HardDrive,
  Network,
  ArrowUpRight,
  TrendingUp,
  Download,
  MonitorSmartphone,
  Wifi,
  WifiOff,
  Cable,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";

interface PerfCheck {
  id: string;
  category: string;
  name: string;
  status: "pass" | "warn" | "fail" | "info";
  severity?: "critical" | "high" | "medium" | "low" | "info";
  description: string;
  value?: string;
  recommendation?: string;
}

interface ResourceStats {
  totalScripts: number;
  syncScripts: number;
  asyncScripts: number;
  deferScripts: number;
  inlineScripts: number;
  totalStylesheets: number;
  inlineStyles: number;
  totalImages: number;
  lazyImages: number;
  totalFonts: number;
  preloadedFonts: number;
}

interface PerfAuditResult {
  url: string;
  timestamp: string;
  score: number;
  grade: string;
  checks: PerfCheck[];
  responseTime: number;
  pageSize: number;
  htmlSize: number;
  resources: ResourceStats;
  technologies: string[];
  serverInfo: {
    server: string | null;
    poweredBy: string | null;
    protocol: string | null;
    compression: string | null;
  };
  thirdPartyDomains: string[];
  estimatedLoadTime: {
    fast3g: string;
    slow3g: string;
    cable: string;
  };
}

const categoryLabels: Record<string, { label: string; icon: typeof Gauge }> = {
  cwv: { label: "Core Web Vitals", icon: Activity },
  server: { label: "Serveur & Reseau", icon: Server },
  resources: { label: "Ressources & Chargement", icon: HardDrive },
  images: { label: "Optimisation des Images", icon: Image },
  fonts: { label: "Polices & Typographie", icon: Type },
  rendering: { label: "Rendu & DOM", icon: Layers },
  optimization: { label: "Optimisation & Hints", icon: Rocket },
};

const statusConfig = {
  pass: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "OK" },
  warn: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Attention" },
  fail: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Critique" },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", label: "Info" },
};

const severityConfig: Record<string, { label: string; color: string }> = {
  critical: { label: "CRITIQUE", color: "text-red-600 bg-red-500/15 border-red-500/30" },
  high: { label: "ELEVE", color: "text-orange-500 bg-orange-500/15 border-orange-500/30" },
  medium: { label: "MOYEN", color: "text-yellow-500 bg-yellow-500/15 border-yellow-500/30" },
  low: { label: "FAIBLE", color: "text-blue-400 bg-blue-400/15 border-blue-400/30" },
};

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

function CheckCard({ check }: { check: PerfCheck }) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[check.status];
  const StatusIcon = config.icon;
  const sev = check.severity && check.severity !== "info" ? severityConfig[check.severity] : null;

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
              <p className="text-xs text-muted-foreground mb-1">Valeur :</p>
              <code className="text-xs bg-muted/50 px-2 py-1 rounded block break-all">
                {check.value}
              </code>
            </div>
          )}
          {check.recommendation && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Recommandation :</p>
              <p className="text-xs text-primary">{check.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuickStats({ result }: { result: PerfAuditResult }) {
  const stats = [
    {
      icon: Timer,
      label: "TTFB",
      value: `${result.responseTime}ms`,
      color: result.responseTime < 600 ? "text-green-500" : result.responseTime < 1500 ? "text-yellow-500" : "text-red-500",
    },
    {
      icon: FileText,
      label: "HTML",
      value: `${result.htmlSize} KB`,
      color: result.htmlSize < 100 ? "text-green-500" : result.htmlSize < 300 ? "text-yellow-500" : "text-red-500",
    },
    {
      icon: Zap,
      label: "Scripts",
      value: `${result.resources.totalScripts}`,
      color: result.resources.totalScripts <= 10 ? "text-green-500" : "text-yellow-500",
    },
    {
      icon: Layers,
      label: "CSS",
      value: `${result.resources.totalStylesheets}`,
      color: result.resources.totalStylesheets <= 5 ? "text-green-500" : "text-yellow-500",
    },
    {
      icon: Image,
      label: "Images",
      value: `${result.resources.totalImages}`,
      color: "text-blue-500",
    },
    {
      icon: Network,
      label: "Tiers",
      value: `${result.thirdPartyDomains.length}`,
      color: result.thirdPartyDomains.length <= 5 ? "text-green-500" : "text-yellow-500",
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

function ResourceBreakdown({ resources }: { resources: ResourceStats }) {
  const items = [
    { label: "Scripts externes", value: resources.totalScripts, sub: `${resources.syncScripts} sync, ${resources.asyncScripts} async, ${resources.deferScripts} defer` },
    { label: "Scripts inline", value: resources.inlineScripts },
    { label: "Feuilles de styles", value: resources.totalStylesheets },
    { label: "Styles inline", value: resources.inlineStyles },
    { label: "Images totales", value: resources.totalImages, sub: `${resources.lazyImages} lazy` },
    { label: "Polices", value: resources.totalFonts, sub: `${resources.preloadedFonts} preloadee(s)` },
  ];

  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/50">
      <div className="flex items-center gap-2 mb-4">
        <HardDrive className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Inventaire des ressources</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.label} className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-2xl font-bold text-foreground">{item.value}</p>
            <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
            {item.sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{item.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function EstimatedLoadTimes({ times }: { times: PerfAuditResult["estimatedLoadTime"] }) {
  const items = [
    { icon: Cable, label: "Cable / Fibre", value: times.cable, color: "text-green-500" },
    { icon: Wifi, label: "3G rapide", value: times.fast3g, color: "text-yellow-500" },
    { icon: WifiOff, label: "3G lente", value: times.slow3g, color: "text-red-500" },
  ];

  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/50">
      <div className="flex items-center gap-2 mb-4">
        <MonitorSmartphone className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Temps de chargement estime</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.label} className="p-4 rounded-xl bg-muted/30 border border-border/30 text-center">
            <item.icon className={cn("w-6 h-6 mx-auto mb-2", item.color)} />
            <p className={cn("text-xl font-bold", item.color)}>{item.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServerInfo({ info }: { info: PerfAuditResult["serverInfo"] }) {
  const items = [
    { label: "Protocole", value: info.protocol || "Inconnu" },
    { label: "Serveur", value: info.server || "Masque" },
    { label: "Powered By", value: info.poweredBy || "Masque" },
    { label: "Compression", value: info.compression || "Aucune" },
  ];

  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/50">
      <div className="flex items-center gap-2 mb-4">
        <Server className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Informations serveur</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item) => (
          <div key={item.label} className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className="text-sm font-medium truncate">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function generateReportText(result: PerfAuditResult) {
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

function generatePDF(result: PerfAuditResult) {
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
  const date = new Date(result.timestamp).toLocaleDateString("fr-BE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const time = new Date(result.timestamp).toLocaleTimeString("fr-BE", {
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

  // HEADER
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, W, 45, "F");

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("RAPPORT D'AUDIT PERFORMANCE", marginL, 18);

  doc.setFontSize(12);
  doc.setTextColor(180, 180, 255);
  doc.text(hostname.toUpperCase(), marginL, 27);

  doc.setFontSize(9);
  doc.setTextColor(160, 160, 160);
  doc.text(`${date}, ${time}`, marginL, 35);

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

  // 1. RESUME
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.text("1. Resume executif", marginL, y);
  y += 8;
  drawLine(y);
  y += 6;

  const passes = result.checks.filter((c) => c.status === "pass").length;
  const warns = result.checks.filter((c) => c.status === "warn").length;
  const fails = result.checks.filter((c) => c.status === "fail").length;

  const summaryItems = [
    ["URL analysee", result.url],
    ["Score global", `${result.score}/100 (${result.grade})`],
    ["TTFB", `${result.responseTime}ms`],
    ["Taille HTML", `${result.htmlSize} KB`],
    ["Compression", result.serverInfo.compression || "Aucune"],
    ["Resultats", `${passes} reussis | ${warns} alertes | ${fails} critiques`],
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

  // 2. RESSOURCES
  checkSpace(40);
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.text("2. Ressources", marginL, y);
  y += 8;
  drawLine(y);
  y += 6;

  const resItems = [
    ["Scripts externes", `${result.resources.totalScripts} (${result.resources.syncScripts} sync, ${result.resources.asyncScripts} async, ${result.resources.deferScripts} defer)`],
    ["Scripts inline", `${result.resources.inlineScripts}`],
    ["Feuilles de styles", `${result.resources.totalStylesheets}`],
    ["Images", `${result.resources.totalImages} (${result.resources.lazyImages} lazy)`],
    ["Polices", `${result.resources.totalFonts} (${result.resources.preloadedFonts} preloadee(s))`],
    ["Domaines tiers", `${result.thirdPartyDomains.length}`],
  ];
  for (const [label, value] of resItems) {
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

  // 3. TEMPS DE CHARGEMENT
  checkSpace(30);
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.text("3. Temps de chargement estimes", marginL, y);
  y += 8;
  drawLine(y);
  y += 6;

  const loadItems = [
    ["Cable / Fibre", result.estimatedLoadTime.cable],
    ["3G rapide", result.estimatedLoadTime.fast3g],
    ["3G lente", result.estimatedLoadTime.slow3g],
  ];
  for (const [label, value] of loadItems) {
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

  // 4. RESULTATS PAR CATEGORIE
  checkSpace(20);
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.text("4. Resultats par categorie", marginL, y);
  y += 8;
  drawLine(y);
  y += 6;

  const catOrder = ["cwv", "server", "resources", "images", "fonts", "rendering", "optimization"];
  const catLabelsMap: Record<string, string> = {
    cwv: "Core Web Vitals",
    server: "Serveur & Reseau",
    resources: "Ressources & Chargement",
    images: "Optimisation des Images",
    fonts: "Polices & Typographie",
    rendering: "Rendu & DOM",
    optimization: "Optimisation & Hints",
  };

  for (const catKey of catOrder) {
    const catChecks = result.checks.filter((c) => c.category === catKey);
    if (catChecks.length === 0) continue;

    checkSpace(15);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text(`${catLabelsMap[catKey]} (${catChecks.length} verifications)`, marginL + 2, y);
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
        const recLines = doc.splitTextToSize(`Recommandation : ${check.recommendation}`, maxW - 17);
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

  // 5. QUICK WINS
  const { quickWins, warnings, improvements } = generateReportText(result);

  if (quickWins.length > 0) {
    checkSpace(20);
    doc.setFontSize(14);
    doc.setTextColor(239, 68, 68);
    doc.setFont("helvetica", "bold");
    doc.text("5. Quick Wins - Action immediate", marginL, y);
    y += 8;
    drawLine(y, [239, 68, 68]);
    y += 6;

    for (const c of quickWins) {
      checkSpace(10);
      writeWrapped(c.name, marginL + 4, 9, [239, 68, 68], "bold");
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
    doc.text("6. Ameliorations recommandees", marginL, y);
    y += 8;
    drawLine(y, [234, 179, 8]);
    y += 6;

    for (const c of warnings) {
      checkSpace(10);
      writeWrapped(c.name, marginL + 4, 9, [234, 179, 8], "bold");
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
    doc.text("7. Optimisations mineures", marginL, y);
    y += 8;
    drawLine(y, [59, 130, 246]);
    y += 6;

    for (const c of improvements) {
      checkSpace(10);
      writeWrapped(c.name, marginL + 4, 9, [59, 130, 246], "bold");
      y += 1;
      writeWrapped(c.recommendation || c.description, marginL + 4, 8, [80, 80, 80]);
      y += 3;
    }
    y += 2;
  }

  // TECHNOLOGIES
  if (result.technologies.length > 0) {
    checkSpace(20);
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.text("Technologies detectees", marginL, y);
    y += 8;
    drawLine(y);
    y += 6;
    writeWrapped(result.technologies.join(", "), marginL + 2, 9, [60, 60, 60]);
    y += 4;
  }

  // THIRD PARTY
  if (result.thirdPartyDomains.length > 0) {
    checkSpace(20);
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.text("Domaines tiers", marginL, y);
    y += 8;
    drawLine(y);
    y += 6;
    writeWrapped(result.thirdPartyDomains.join(", "), marginL + 2, 8, [60, 60, 60]);
    y += 4;
  }

  // FOOTER
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Rapport Performance - ${hostname} - ${date} - Page ${i}/${totalPages}`,
      marginL,
      H - 10
    );
    doc.text("The Webmaster - Performance Audit Tool", W - marginR - 55, H - 10);
  }

  doc.save(`perf-audit-${hostname}-${new Date().toISOString().split("T")[0]}.pdf`);
}

function PerfReport({ result }: { result: PerfAuditResult }) {
  const [copied, setCopied] = useState(false);
  const { quickWins, warnings, improvements } = generateReportText(result);

  const reportText = `RAPPORT D'AUDIT PERFORMANCE
${"=".repeat(50)}
Site : ${result.url}
Date : ${new Date(result.timestamp).toLocaleString("fr-BE")}
Score : ${result.score}/100 (${result.grade})
TTFB : ${result.responseTime}ms
Taille HTML : ${result.htmlSize} KB
Compression : ${result.serverInfo.compression || "Aucune"}

RESUME
------
- ${result.checks.filter((c) => c.status === "pass").length} tests reussis
- ${result.checks.filter((c) => c.status === "warn").length} alertes
- ${result.checks.filter((c) => c.status === "fail").length} problemes critiques

RESSOURCES
----------
Scripts : ${result.resources.totalScripts} externes (${result.resources.syncScripts} sync) + ${result.resources.inlineScripts} inline
CSS : ${result.resources.totalStylesheets} externes + ${result.resources.inlineStyles} inline
Images : ${result.resources.totalImages} (${result.resources.lazyImages} lazy)
Polices : ${result.resources.totalFonts} (${result.resources.preloadedFonts} preloadees)
Domaines tiers : ${result.thirdPartyDomains.length}

TEMPS DE CHARGEMENT ESTIMES
----------------------------
Cable/Fibre : ${result.estimatedLoadTime.cable}
3G rapide : ${result.estimatedLoadTime.fast3g}
3G lente : ${result.estimatedLoadTime.slow3g}

${quickWins.length > 0 ? `QUICK WINS (priorite haute)\n${"-".repeat(30)}\n${quickWins.map((c) => `- [${c.severity?.toUpperCase()}] ${c.name}: ${c.recommendation || c.description}`).join("\n")}\n` : ""}
${warnings.length > 0 ? `AMELIORATIONS RECOMMANDEES\n${"-".repeat(30)}\n${warnings.map((c) => `- [${c.severity?.toUpperCase()}] ${c.name}: ${c.recommendation || c.description}`).join("\n")}\n` : ""}
${improvements.length > 0 ? `OPTIMISATIONS MINEURES\n${"-".repeat(30)}\n${improvements.map((c) => `- ${c.name}: ${c.recommendation || c.description}`).join("\n")}\n` : ""}
TECHNOLOGIES DETECTEES
${"-".repeat(30)}
${result.technologies.join(", ") || "Aucune"}

DOMAINES TIERS
${"-".repeat(30)}
${result.thirdPartyDomains.join(", ") || "Aucun"}

---
Genere par TheWebmaster Performance Audit Tool
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
          <Gauge className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Recommandations priorisees</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copie !" : "Copier"}
          </Button>
          <Button size="sm" onClick={() => generatePDF(result)} className="gap-2">
            <Download className="w-4 h-4" />
            Telecharger PDF
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {quickWins.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <h4 className="font-semibold text-sm text-red-500">Quick Wins — Impact fort, action rapide</h4>
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
              <h4 className="font-semibold text-sm text-yellow-500">Ameliorations recommandees</h4>
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
              <h4 className="font-semibold text-sm text-blue-500">Optimisations mineures</h4>
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
            <p className="text-sm text-muted-foreground">Excellent ! Aucun probleme majeur de performance detecte.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PerformanceAuditClient() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<PerfAuditResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/performance-audit", {
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

  const grouped = result?.checks.reduce(
    (acc, check) => {
      const cat = check.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(check);
      return acc;
    },
    {} as Record<string, PerfCheck[]>
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
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            The<span className="text-primary">Webmaster</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Gauge className="w-4 h-4 text-primary" />
            Performance Audit Tool
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Gauge className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Audit Performance <span className="text-primary">Web</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Analysez les performances d&apos;un site web : Core Web Vitals, ressources, images,
            polices, rendu DOM et optimisations.
          </p>
        </div>

        <form onSubmit={handleAudit} className="max-w-2xl mx-auto mb-12">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="exemple.com"
                className="w-full h-12 pl-12 pr-4 rounded-xl border bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                disabled={status === "loading"}
              />
            </div>
            <Button type="submit" size="lg" className="h-12 px-6" disabled={status === "loading"}>
              {status === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyse...
                </>
              ) : (
                <>
                  <Gauge className="w-4 h-4 mr-2" />
                  Analyser
                </>
              )}
            </Button>
          </div>
          {status === "error" && (
            <p className="text-sm text-red-500 mt-3 text-center">{errorMsg}</p>
          )}
        </form>

        {status === "loading" && (
          <div className="text-center py-20">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-muted/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <Gauge className="absolute inset-0 m-auto w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground animate-pulse">
              Analyse de performance en cours... Verification des ressources, images, polices et optimisations.
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-8">
            {/* Score + Summary */}
            <div className="p-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <ScoreRing score={result.score} grade={result.grade} />
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-xl font-bold mb-1">Resultat de l&apos;audit performance</h2>
                  <p className="text-sm text-muted-foreground mb-4 break-all">{result.url}</p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    {summary &&
                      (
                        [
                          ["pass", summary.pass, "Reussis"],
                          ["warn", summary.warn, "Alertes"],
                          ["fail", summary.fail, "Critiques"],
                          ["info", summary.info, "Infos"],
                        ] as const
                      ).map(([key, count, label]) => {
                        const conf = statusConfig[key];
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

            <QuickStats result={result} />

            <EstimatedLoadTimes times={result.estimatedLoadTime} />

            <ServerInfo info={result.serverInfo} />

            <ResourceBreakdown resources={result.resources} />

            {/* Technologies */}
            {result.technologies.length > 0 && (
              <div className="p-6 rounded-2xl border border-border/50 bg-card/50">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Technologies detectees</h3>
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

            {/* Third-party domains */}
            {result.thirdPartyDomains.length > 0 && (
              <div className="p-6 rounded-2xl border border-border/50 bg-card/50">
                <div className="flex items-center gap-2 mb-4">
                  <Network className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Domaines tiers ({result.thirdPartyDomains.length})</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.thirdPartyDomains.map((domain) => (
                    <span
                      key={domain}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground border border-border/30"
                    >
                      {domain}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Checks by category */}
            {grouped &&
              ["cwv", "server", "resources", "images", "fonts", "rendering", "optimization"].map((categoryKey) => {
                const checks = grouped[categoryKey];
                if (!checks || checks.length === 0) return null;
                const catInfo = categoryLabels[categoryKey] || {
                  label: categoryKey,
                  icon: Gauge,
                };
                const CatIcon = catInfo.icon;
                return (
                  <div key={categoryKey}>
                    <div className="flex items-center gap-2 mb-3">
                      <CatIcon className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">{catInfo.label}</h3>
                      <span className="text-xs text-muted-foreground">
                        ({checks.length} verification{checks.length > 1 ? "s" : ""})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {checks.map((check) => (
                        <CheckCard key={check.id} check={check} />
                      ))}
                    </div>
                  </div>
                );
              })}

            <PerfReport result={result} />

            <div className="p-4 rounded-xl border border-border/30 bg-muted/20 text-center">
              <p className="text-xs text-muted-foreground">
                Cet outil analyse les informations publiquement accessibles (HTML, headers HTTP, structure des ressources).
                Les metriques Core Web Vitals sont estimees a partir du HTML statique — pour des mesures reelles, utilisez
                Google PageSpeed Insights ou Lighthouse.
                Analyse le {new Date(result.timestamp).toLocaleString("fr-BE")} — TTFB : {result.responseTime}ms
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
