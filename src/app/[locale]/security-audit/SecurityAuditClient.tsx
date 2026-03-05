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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";

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

const categoryLabels: Record<string, { label: string; icon: typeof Shield }> = {
  ssl: { label: "SSL / HTTPS", icon: Lock },
  headers: { label: "En-têtes de sécurité", icon: Shield },
  "info-leak": { label: "Fuite d'information", icon: Server },
  cookies: { label: "Cookies", icon: Cookie },
  owasp: { label: "OWASP — Vulnérabilités Web", icon: Bug },
  xss: { label: "Protection XSS & CSRF", icon: ShieldAlert },
  infra: { label: "Infrastructure & DNS", icon: Network },
  rgpd: { label: "RGPD / Compliance", icon: Scale },
  incident: { label: "Incident Response & Monitoring", icon: Siren },
  performance: { label: "Performance", icon: Gauge },
  misc: { label: "Divers", icon: Globe },
};

const statusConfig = {
  pass: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "OK" },
  warn: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Attention" },
  fail: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Critique" },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", label: "Info" },
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

const severityConfig: Record<string, { label: string; color: string }> = {
  critical: { label: "CRITIQUE", color: "text-red-600 bg-red-500/15 border-red-500/30" },
  high: { label: "ÉLEVÉ", color: "text-orange-500 bg-orange-500/15 border-orange-500/30" },
  medium: { label: "MOYEN", color: "text-yellow-500 bg-yellow-500/15 border-yellow-500/30" },
  low: { label: "FAIBLE", color: "text-blue-400 bg-blue-400/15 border-blue-400/30" },
};

function CheckCard({ check }: { check: AuditCheck }) {
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

// =============================================================================
// AUTO-GENERATED REPORT
// =============================================================================

const statusLabels: Record<string, string> = {
  "production-ready": "✅ Production Ready",
  "needs-fixes": "⚠️ Nécessite des corrections",
  "at-risk": "🟠 À risque",
  critical: "🔴 Critique — Action immédiate requise",
};

function generateReportText(result: AuditResult): string {
  const date = new Date(result.timestamp).toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = new Date(result.timestamp).toLocaleTimeString("fr-BE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const hostname = new URL(result.url).hostname;

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
  r += `  RAPPORT D'AUDIT DE SÉCURITÉ WEB\n`;
  r += `  ${hostname.toUpperCase()}\n`;
  r += `${doubleLine}\n\n`;

  // ─── 1. RÉSUMÉ EXÉCUTIF ──────────────────────────────────────
  r += `🎯 1. RÉSUMÉ EXÉCUTIF\n`;
  r += `${line}\n\n`;
  r += `  URL analysée :     ${result.url}\n`;
  r += `  Date :             ${date}, ${time}\n`;
  r += `  Score global :     ${result.score}/100 (${result.grade})\n`;
  r += `  Statut :           ${statusLabels[result.status]}\n`;
  r += `  Temps de réponse : ${result.responseTime}ms\n`;
  r += `  HTTPS :            ${result.tlsInfo.secure ? "Oui ✅" : "Non ❌"}\n\n`;

  r += `  Vulnérabilités par sévérité :\n`;
  r += `  🔴 Critiques : ${criticals.length}     🟠 Élevées : ${highs.length}\n`;
  r += `  🟡 Moyennes :  ${mediums.length}     🔵 Faibles : ${lows.length}\n\n`;

  r += `  Résultats : ${passes.length} ✅  |  ${warns.length} ⚠️  |  ${fails.length} ❌  (${result.checks.length} tests)\n\n`;

  // Top 5 actions
  const topActions = [...criticals, ...highs, ...mediums.filter((c) => c.status !== "pass")]
    .filter((c) => c.recommendation)
    .slice(0, 5);
  if (topActions.length > 0) {
    r += `  Actions prioritaires :\n`;
    topActions.forEach((c, i) => {
      r += `  ${i + 1}. ${c.recommendation}\n`;
    });
    r += `\n`;
  }

  // Timeline
  if (criticals.length > 0) r += `  ⏰ Timeline : Corrections critiques sous 24h\n`;
  else if (highs.length > 0) r += `  ⏰ Timeline : Corrections élevées sous 7 jours\n`;
  else if (mediums.length > 0) r += `  ⏰ Timeline : Améliorations sous 30 jours\n`;
  else r += `  ⏰ Timeline : Maintenance régulière recommandée\n`;
  r += `\n`;

  // ─── 2. SCOPE & MÉTHODOLOGIE ─────────────────────────────────
  r += `🔍 2. SCOPE & MÉTHODOLOGIE\n`;
  r += `${line}\n\n`;
  r += `  Périmètre :\n`;
  r += `  • URL principale : ${result.url}\n`;
  r += `  • Type d'analyse : Externe (boîte noire)\n`;
  r += `  • ${result.checks.length} vérifications automatisées\n\n`;

  if (result.technologies.length > 0) {
    r += `  Technologies identifiées :\n`;
    result.technologies.forEach((t) => {
      r += `  • ${t}\n`;
    });
    r += `\n`;
  }

  r += `  Méthodes utilisées :\n`;
  r += `  • Analyse des en-têtes HTTP de sécurité\n`;
  r += `  • Vérification SSL/TLS et configuration HTTPS\n`;
  r += `  • Scan de fichiers et répertoires sensibles (OWASP)\n`;
  r += `  • Analyse DNS (SPF, DMARC, DKIM, DNSSEC)\n`;
  r += `  • Détection WAF et infrastructure\n`;
  r += `  • Audit de conformité RGPD\n`;
  r += `  • Analyse du code source HTML (XSS, CSRF)\n`;
  r += `  • Vérification monitoring et réponse aux incidents\n\n`;

  r += `  Standards de référence :\n`;
  r += `  • OWASP Top 10 (2021)\n`;
  r += `  • RGPD (Règlement Général sur la Protection des Données)\n`;
  r += `  • RFC 9116 (security.txt)\n`;
  r += `  • Mozilla Observatory / Security Headers\n\n`;

  // ─── 3. SCORES PAR CATÉGORIE ─────────────────────────────────
  r += `📊 3. SCORES PAR CATÉGORIE\n`;
  r += `${line}\n\n`;

  const maxLabelLen = Math.max(...result.categoryScores.map((cs) => cs.label.length));
  result.categoryScores.forEach((cs) => {
    const bar = "█".repeat(Math.round(cs.score / 5)) + "░".repeat(20 - Math.round(cs.score / 5));
    const pad = " ".repeat(maxLabelLen - cs.label.length);
    r += `  ${cs.label}${pad}  ${bar}  ${cs.score}/100 (${cs.grade})\n`;
  });

  // Global
  const globalBar = "█".repeat(Math.round(result.score / 5)) + "░".repeat(20 - Math.round(result.score / 5));
  r += `  ${"─".repeat(maxLabelLen + 30)}\n`;
  r += `  ${"SCORE GLOBAL"}${" ".repeat(maxLabelLen - 12)}  ${globalBar}  ${result.score}/100 (${result.grade})\n\n`;

  // ─── 4. VULNÉRABILITÉS CRITIQUES & ÉLEVÉES ───────────────────
  const urgent = [...criticals, ...highs];
  if (urgent.length > 0) {
    r += `🚨 4. VULNÉRABILITÉS CRITIQUES & ÉLEVÉES\n`;
    r += `${line}\n`;
    urgent.forEach((c, i) => {
      const sev = c.severity === "critical" ? "🔴 CRITIQUE" : "🟠 ÉLEVÉ";
      r += `\n  ${sev}: ${c.name}\n`;
      r += `  ├─ Description :    ${c.description}\n`;
      if (c.value) r += `  ├─ Valeur :        ${c.value}\n`;
      r += `  ├─ Impact :        ${c.severity === "critical" ? "Compromission possible du système" : "Risque significatif pour la sécurité"}\n`;
      r += `  ├─ Correction :    ${c.severity === "critical" ? "0-24h" : "1-7 jours"}\n`;
      if (c.recommendation) r += `  └─ Remédiation :   ${c.recommendation}\n`;
    });
    r += `\n`;
  } else {
    r += `🚨 4. VULNÉRABILITÉS CRITIQUES & ÉLEVÉES\n`;
    r += `${line}\n\n`;
    r += `  ✅ Aucune vulnérabilité critique ou élevée détectée.\n\n`;
  }

  // ─── 5. ALERTES DE SÉVÉRITÉ MOYENNE ──────────────────────────
  const mediumFails = mediums.filter((c) => c.status !== "pass");
  if (mediumFails.length > 0) {
    r += `⚠️ 5. ALERTES DE SÉVÉRITÉ MOYENNE\n`;
    r += `${line}\n`;
    mediumFails.forEach((c, i) => {
      r += `\n  ${i + 1}. 🟡 ${c.name}\n`;
      r += `     ${c.description}\n`;
      if (c.recommendation) r += `     → ${c.recommendation}\n`;
    });
    r += `\n`;
  } else {
    r += `⚠️ 5. ALERTES DE SÉVÉRITÉ MOYENNE\n`;
    r += `${line}\n\n`;
    r += `  ✅ Aucune alerte de sévérité moyenne.\n\n`;
  }

  // ─── 6. RECOMMANDATIONS (FAIBLES) ────────────────────────────
  const lowFails = lows.filter((c) => c.status !== "pass");
  if (lowFails.length > 0) {
    r += `💡 6. RECOMMANDATIONS\n`;
    r += `${line}\n\n`;
    lowFails.forEach((c, i) => {
      r += `  ${i + 1}. ${c.name}\n`;
      r += `     ${c.description}\n`;
      if (c.recommendation) r += `     → ${c.recommendation}\n\n`;
    });
  }

  // ─── 7. INVENTAIRE DÉTAILLÉ PAR CATÉGORIE ────────────────────
  r += `📋 7. INVENTAIRE DÉTAILLÉ PAR CATÉGORIE\n`;
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
    r += `\n  ■ ${catScore?.label || cat.toUpperCase()}`;
    if (catScore) r += ` — ${catScore.score}/100 (${catScore.grade})`;
    r += `\n`;

    checks.forEach((c) => {
      const icon = c.status === "pass" ? "✅" : c.status === "fail" ? "❌" : c.status === "warn" ? "⚠️" : "ℹ️";
      r += `    ${icon} ${c.name}`;
      if (c.status !== "pass" && c.severity && c.severity !== "info") {
        const sevLabel =
          c.severity === "critical" ? "[CRITIQUE]" :
          c.severity === "high" ? "[ÉLEVÉ]" :
          c.severity === "medium" ? "[MOYEN]" : "[FAIBLE]";
        r += ` ${sevLabel}`;
      }
      r += `\n`;
    });
  });
  r += `\n`;

  // ─── 8. POINTS POSITIFS ──────────────────────────────────────
  if (passes.length > 0) {
    r += `✅ 8. POINTS POSITIFS\n`;
    r += `${line}\n\n`;
    passes.forEach((c) => {
      r += `  • ${c.name}\n`;
    });
    r += `\n`;
  }

  // ─── 9. ROADMAP DE REMÉDIATION ───────────────────────────────
  r += `🎯 9. ROADMAP DE REMÉDIATION\n`;
  r += `${line}\n\n`;

  const immActions = urgent.filter((c) => c.recommendation);
  const shortActions = mediumFails.filter((c) => c.recommendation);
  const longActions = lowFails.filter((c) => c.recommendation);

  if (immActions.length > 0) {
    r += `  Actions immédiates (0-7 jours) :\n`;
    immActions.forEach((c, i) => {
      r += `  ${i + 1}. ${c.recommendation}\n`;
    });
    r += `\n`;
  }

  if (shortActions.length > 0) {
    r += `  Court terme (1-3 mois) :\n`;
    shortActions.forEach((c, i) => {
      r += `  ${i + 1}. ${c.recommendation}\n`;
    });
    r += `\n`;
  }

  if (longActions.length > 0) {
    r += `  Long terme (3-12 mois) :\n`;
    longActions.forEach((c, i) => {
      r += `  ${i + 1}. ${c.recommendation}\n`;
    });
    r += `\n`;
  }

  if (immActions.length === 0 && shortActions.length === 0 && longActions.length === 0) {
    r += `  ✅ Aucune action corrective majeure nécessaire.\n`;
    r += `  Maintenir une veille sécurité régulière et planifier des audits périodiques.\n\n`;
  }

  // ─── 10. CONCLUSION ──────────────────────────────────────────
  r += `📝 10. CONCLUSION\n`;
  r += `${line}\n\n`;

  if (result.score >= 85) {
    r += `  Le site ${hostname} présente un bon niveau de sécurité (${result.grade}, ${result.score}/100).\n`;
    r += `  Les fondamentaux sont en place. Quelques améliorations mineures\n`;
    r += `  permettraient d'atteindre un niveau optimal.\n\n`;
    r += `  Recommandation : Maintenir le niveau actuel avec des audits\n`;
    r += `  trimestriels et une veille sur les nouvelles vulnérabilités.\n`;
  } else if (result.score >= 60) {
    r += `  Le site ${hostname} présente un niveau de sécurité acceptable\n`;
    r += `  (${result.grade}, ${result.score}/100) mais nécessite des améliorations significatives.\n\n`;
    r += `  Recommandation : Priorisez les corrections critiques et élevées\n`;
    r += `  dans les 7 prochains jours, puis traitez les alertes moyennes\n`;
    r += `  dans le mois suivant.\n`;
  } else if (result.score >= 40) {
    r += `  Le site ${hostname} présente des faiblesses de sécurité importantes\n`;
    r += `  (${result.grade}, ${result.score}/100). Une intervention rapide est nécessaire.\n\n`;
    r += `  Recommandation : Mobilisez une équipe technique pour corriger\n`;
    r += `  les vulnérabilités critiques dans les 24-48h. Un plan de\n`;
    r += `  remédiation complet doit être mis en place immédiatement.\n`;
  } else {
    r += `  Le site ${hostname} présente un niveau de sécurité insuffisant\n`;
    r += `  (${result.grade}, ${result.score}/100). Des risques majeurs ont été identifiés.\n\n`;
    r += `  Recommandation : URGENCE — Stoppez toute mise en production.\n`;
    r += `  Les vulnérabilités critiques doivent être corrigées AVANT toute\n`;
    r += `  exposition publique. Un audit approfondi par un professionnel\n`;
    r += `  de la cybersécurité est fortement recommandé.\n`;
  }

  r += `\n`;
  r += `${doubleLine}\n`;
  r += `  Rapport généré par The Webmaster — Security Audit Tool v2.0\n`;
  r += `  https://thewebmaster.pro/fr/security-audit\n`;
  r += `  ${date}, ${time}\n`;
  r += `${doubleLine}\n`;

  return r;
}

function generatePDF(result: AuditResult) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const hostname = new URL(result.url).hostname;
  const date = new Date(result.timestamp).toLocaleDateString("fr-BE", {
    day: "numeric", month: "long", year: "numeric",
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 0;

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
      // Footer before new page
      doc.setFontSize(7);
      doc.setTextColor(...colors.muted);
      doc.text(`The Webmaster — Security Audit Report — ${hostname}`, pageW / 2, pageH - 10, { align: "center" });
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
  doc.text("THE WEBMASTER — SECURITY AUDIT TOOL", margin, 18);

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Rapport d'Audit de Sécurité", margin, 33);

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
  doc.text(statusLabels[result.status].replace(/[^\w\sÀ-ÿ—]/g, "").trim(), margin + 30, y + 20);

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
  doc.setTextColor(...colors.yellow); doc.text(`${warns.length} Alertes`, cx + 22, y + 10);
  doc.setTextColor(...colors.red); doc.text(`${fails.length} Critiques`, cx + 48, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...colors.muted);
  doc.text(`${result.checks.length} tests | ${result.responseTime}ms`, cx, y + 19);

  y += 36;

  // ─── 1. RÉSUMÉ EXÉCUTIF ───────────────────────────────────────
  sectionTitle("1. Résumé Exécutif");
  bodyText(`URL analysée : ${result.url}`);
  bodyText(`Score global : ${result.score}/100 (${result.grade}) — ${statusLabels[result.status].replace(/[^\w\sÀ-ÿ—]/g, "").trim()}`);
  bodyText(`HTTPS : ${result.tlsInfo.secure ? "Oui" : "Non"} | Temps de réponse : ${result.responseTime}ms`);
  bodyText(`Vulnérabilités : ${criticals.length} critiques, ${highs.length} élevées, ${warns.length} alertes`);
  y += 3;

  const topActions = [...criticals, ...highs].filter(c => c.recommendation).slice(0, 5);
  if (topActions.length > 0) {
    bodyText("Top actions prioritaires :", { bold: true });
    topActions.forEach((c, i) => {
      bodyText(`${i + 1}. ${c.recommendation}`, { indent: 4 });
    });
    y += 2;
  }

  // ─── 2. SCOPE & MÉTHODOLOGIE ──────────────────────────────────
  sectionTitle("2. Scope & Méthodologie");
  bodyText(`Périmètre : ${result.url} — Analyse externe (boîte noire)`);
  bodyText(`${result.checks.length} vérifications automatisées`);
  if (result.technologies.length > 0) {
    bodyText(`Technologies détectées : ${result.technologies.join(", ")}`);
  }
  bodyText("Standards : OWASP Top 10 (2021), RGPD, RFC 9116, Mozilla Observatory");
  y += 3;

  // ─── 3. SCORES PAR CATÉGORIE ──────────────────────────────────
  sectionTitle("3. Scores par Catégorie");
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

  // ─── 4. VULNÉRABILITÉS CRITIQUES & ÉLEVÉES ────────────────────
  const urgent = [...criticals, ...highs];
  sectionTitle("4. Vulnérabilités Critiques & Élevées");
  if (urgent.length === 0) {
    bodyText("Aucune vulnérabilité critique ou élevée détectée.", { color: colors.green });
    y += 3;
  } else {
    urgent.forEach(c => {
      const sevColor = c.severity === "critical" ? colors.red : colors.orange;
      const sevLabel = c.severity === "critical" ? "CRITIQUE" : "ÉLEVÉ";
      bodyText(`[${sevLabel}] ${c.name}`, { bold: true, color: sevColor });
      bodyText(c.description, { indent: 4 });
      if (c.value) bodyText(`Valeur : ${c.value}`, { indent: 4, color: colors.muted });
      if (c.recommendation) bodyText(`Remédiation : ${c.recommendation}`, { indent: 4, color: colors.primary });
      y += 2;
    });
  }

  // ─── 5. ALERTES MOYENNES ──────────────────────────────────────
  const mediums = result.checks.filter(c => c.severity === "medium" && c.status !== "pass");
  sectionTitle("5. Alertes de Sévérité Moyenne");
  if (mediums.length === 0) {
    bodyText("Aucune alerte de sévérité moyenne.", { color: colors.green });
    y += 3;
  } else {
    mediums.forEach((c, i) => {
      bodyText(`${i + 1}. ${c.name}`, { bold: true });
      bodyText(c.description, { indent: 4 });
      if (c.recommendation) bodyText(`→ ${c.recommendation}`, { indent: 4, color: colors.primary });
      y += 1;
    });
    y += 2;
  }

  // ─── 6. RECOMMANDATIONS ───────────────────────────────────────
  const lows = result.checks.filter(c => c.severity === "low" && c.status !== "pass");
  sectionTitle("6. Recommandations (Faibles)");
  if (lows.length === 0) {
    bodyText("Aucune recommandation de faible sévérité.", { color: colors.green });
    y += 3;
  } else {
    lows.forEach((c, i) => {
      bodyText(`${i + 1}. ${c.name} — ${c.description}`, { indent: 0 });
      if (c.recommendation) bodyText(`→ ${c.recommendation}`, { indent: 4, color: colors.primary });
      y += 1;
    });
    y += 2;
  }

  // ─── 7. INVENTAIRE DÉTAILLÉ ───────────────────────────────────
  sectionTitle("7. Inventaire Détaillé par Catégorie");
  const grouped = result.checks.reduce((acc, check) => {
    if (!acc[check.category]) acc[check.category] = [];
    acc[check.category].push(check);
    return acc;
  }, {} as Record<string, AuditCheck[]>);

  Object.entries(grouped).forEach(([cat, checks]) => {
    const catScore = result.categoryScores.find(cs => cs.category === cat);
    checkPage(8);
    bodyText(`${catScore?.label || cat} — ${catScore?.score ?? "?"}/100 (${catScore?.grade ?? "?"})`, { bold: true });
    checks.forEach(c => {
      const icon = c.status === "pass" ? "[OK]" : c.status === "fail" ? "[FAIL]" : c.status === "warn" ? "[WARN]" : "[INFO]";
      const iconColor = c.status === "pass" ? colors.green : c.status === "fail" ? colors.red : c.status === "warn" ? colors.yellow : colors.muted;
      bodyText(`  ${icon} ${c.name}`, { color: iconColor, indent: 4 });
    });
    y += 2;
  });

  // ─── 8. POINTS POSITIFS ───────────────────────────────────────
  if (passes.length > 0) {
    sectionTitle("8. Points Positifs");
    passes.forEach(c => {
      bodyText(`• ${c.name}`, { color: colors.green });
    });
    y += 3;
  }

  // ─── 9. ROADMAP ───────────────────────────────────────────────
  sectionTitle("9. Roadmap de Remédiation");
  const immActions = urgent.filter(c => c.recommendation);
  const shortActions = mediums.filter(c => c.recommendation);
  const longActions = lows.filter(c => c.recommendation);

  if (immActions.length > 0) {
    bodyText("Actions immédiates (0-7 jours) :", { bold: true, color: colors.red });
    immActions.forEach((c, i) => bodyText(`${i + 1}. ${c.recommendation}`, { indent: 4 }));
    y += 2;
  }
  if (shortActions.length > 0) {
    bodyText("Court terme (1-3 mois) :", { bold: true, color: colors.orange });
    shortActions.forEach((c, i) => bodyText(`${i + 1}. ${c.recommendation}`, { indent: 4 }));
    y += 2;
  }
  if (longActions.length > 0) {
    bodyText("Long terme (3-12 mois) :", { bold: true, color: colors.muted });
    longActions.forEach((c, i) => bodyText(`${i + 1}. ${c.recommendation}`, { indent: 4 }));
    y += 2;
  }
  if (immActions.length === 0 && shortActions.length === 0 && longActions.length === 0) {
    bodyText("Aucune action corrective majeure nécessaire. Maintenir une veille régulière.", { color: colors.green });
    y += 3;
  }

  // ─── 10. CONCLUSION ───────────────────────────────────────────
  sectionTitle("10. Conclusion");
  if (result.score >= 85) {
    bodyText(`Le site ${hostname} présente un bon niveau de sécurité (${result.grade}, ${result.score}/100). Les fondamentaux sont en place. Quelques améliorations mineures permettraient d'atteindre un niveau optimal.`);
    bodyText("Recommandation : Maintenir le niveau actuel avec des audits trimestriels et une veille sur les nouvelles vulnérabilités.");
  } else if (result.score >= 60) {
    bodyText(`Le site ${hostname} présente un niveau de sécurité acceptable (${result.grade}, ${result.score}/100) mais nécessite des améliorations significatives.`);
    bodyText("Recommandation : Priorisez les corrections critiques et élevées dans les 7 prochains jours.");
  } else if (result.score >= 40) {
    bodyText(`Le site ${hostname} présente des faiblesses de sécurité importantes (${result.grade}, ${result.score}/100). Une intervention rapide est nécessaire.`);
    bodyText("Recommandation : Mobilisez une équipe technique pour corriger les vulnérabilités critiques dans les 24-48h.");
  } else {
    bodyText(`Le site ${hostname} présente un niveau de sécurité insuffisant (${result.grade}, ${result.score}/100). Des risques majeurs ont été identifiés.`);
    bodyText("URGENCE — Stoppez toute mise en production. Un audit approfondi par un professionnel de la cybersécurité est fortement recommandé.", { bold: true, color: colors.red });
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
  doc.text("Rapport généré par The Webmaster — Security Audit Tool v2.0", margin, y);
  y += 4;
  doc.text("https://thewebmaster.pro/fr/security-audit", margin, y);
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
      doc.text(`The Webmaster — Security Audit Report — ${hostname}`, pageW / 2, pageH - 10, { align: "center" });
    }
  }

  doc.save(`audit-securite-${hostname}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function AuditReport({ result }: { result: AuditResult }) {
  const [copied, setCopied] = useState(false);
  const report = generateReportText(result);

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
            <h3 className="text-lg font-bold">Rapport d&apos;audit</h3>
            <p className="text-xs text-muted-foreground">
              Synthèse des résultats et plan d&apos;action
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => generatePDF(result)} className="gap-2">
            <Download className="w-4 h-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                Copié
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copier
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

export default function SecurityAuditClient() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/security-audit", {
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
            Security Audit Tool
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
            Audit de Sécurité <span className="text-primary">Web</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Analysez en profondeur la sécurité d&apos;un site web : headers HTTP, SSL/TLS,
            cookies, fuites d&apos;information, technologies détectées et plus.
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
                  <Search className="w-4 h-4 mr-2" />
                  Analyser
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
              Analyse en cours... Vérification des headers, SSL, cookies et technologies.
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
                  <h2 className="text-xl font-bold mb-1">Résultat de l&apos;audit</h2>
                  <p className="text-sm text-muted-foreground mb-4 break-all">{result.url}</p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    {summary &&
                      (
                        [
                          ["pass", summary.pass, "Réussis"],
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

            {/* Technologies */}
            {result.technologies.length > 0 && (
              <div className="p-6 rounded-2xl border border-border/50 bg-card/50">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Technologies détectées</h3>
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
                        ({checks.length} vérification{checks.length > 1 ? "s" : ""})
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

            {/* Auto-generated Report */}
            <AuditReport result={result} />

            {/* Disclaimer */}
            <div className="p-4 rounded-xl border border-border/30 bg-muted/20 text-center">
              <p className="text-xs text-muted-foreground">
                Cet outil analyse les informations publiquement accessibles (headers HTTP, code source HTML).
                Il ne remplace pas un audit de sécurité professionnel complet.
                Analysé le {new Date(result.timestamp).toLocaleString("fr-BE")} — Temps de réponse : {result.responseTime}ms
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
