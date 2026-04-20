"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle2, XCircle, Info, Copy, Check,
  Clock, Target, Layers, Scale, Globe, Search, Award,
} from "lucide-react";
import type { AuditResult, AuditCheck, ActionItem, ThreatVector } from "@/types/audit";

export default function PublicSeoReportClient({
  id, locale, createdAt, report,
}: {
  id: string;
  locale: string;
  createdAt: string;
  report: AuditResult;
}) {
  const [copiedBadge, setCopiedBadge] = useState<"md" | "html" | "url" | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const host = safeHost(report.url);
  const scoreColor = scoreColorClass(report.score);
  const badgeUrl = `/api/seo-audit/badge/${id}.svg`;
  const pageUrl = typeof window !== "undefined" ? `${window.location.origin}/${locale}/seo-audit/r/${id}` : "";
  const absoluteBadgeUrl = typeof window !== "undefined" ? `${window.location.origin}${badgeUrl}` : badgeUrl;

  const markdownBadge = `[![seo audit](${absoluteBadgeUrl})](${pageUrl})`;
  const htmlBadge = `<a href="${pageUrl}"><img src="${absoluteBadgeUrl}" alt="seo audit"/></a>`;

  function copy(text: string, kind: "md" | "html" | "url") {
    navigator.clipboard.writeText(text);
    setCopiedBadge(kind);
    setTimeout(() => setCopiedBadge(null), 2000);
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-background to-muted/20">
      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="size-4" />
              <span className="font-mono">{host}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Search className="size-7 text-primary" />
              Audit SEO
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Généré le {formatDate(createdAt)} par <Link href={`/${locale}`} className="underline hover:text-primary">The Webmaster</Link>
            </p>
          </div>
          <Link href={`/${locale}/seo-audit`} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
            Auditer mon site
          </Link>
        </div>

        {/* Score + site type */}
        <section className="mb-8 grid gap-6 rounded-lg border bg-card p-8 md:grid-cols-[auto,1fr]">
          <ScoreRing score={report.score} grade={report.grade} colorClass={scoreColor} />
          <div className="flex flex-col justify-center">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={report.status} />
              {report.siteContext?.type && report.siteContext.type !== "unknown" && (
                <span className="rounded-full border px-2 py-0.5 text-xs font-medium capitalize">
                  {report.siteContext.type}
                </span>
              )}
              {report.stack?.primaryFramework && (
                <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
                  {report.stack.primaryFramework}
                </span>
              )}
            </div>
            <p className="text-muted-foreground">{statusSentence(report)}</p>
            {report.crawledRoutes && report.crawledRoutes.length > 1 && (
              <p className="mt-2 text-xs text-muted-foreground">
                <Layers className="mr-1 inline size-3" />
                {report.crawledRoutes.length} routes auditées
              </p>
            )}
          </div>
        </section>

        {/* SEO Meta snapshot */}
        {report.seoMeta && (
          <section className="mb-6 rounded-lg border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Award className="size-4 text-primary" />
              Balises méta détectées
            </h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <MetaRow label="Title" value={report.seoMeta.title} max={80} />
              <MetaRow label="Description" value={report.seoMeta.description} max={160} />
              <MetaRow label="Canonical" value={report.seoMeta.canonical} mono />
              <MetaRow label="Langue" value={report.seoMeta.language} />
              <MetaRow label="OG Image" value={report.seoMeta.ogImage} mono />
              <MetaRow label="Robots" value={report.seoMeta.robots} />
            </dl>
          </section>
        )}

        {/* Regressions */}
        {report.regressions && report.regressions.length > 0 && (
          <section className="mb-6 rounded-lg border border-orange-500/50 bg-orange-500/10 p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold text-orange-700 dark:text-orange-300">
              <TrendingDown className="size-5" />
              {report.regressions.length} régression{report.regressions.length > 1 ? "s" : ""} depuis le dernier audit
            </div>
            <ul className="space-y-1 text-sm">
              {report.regressions.slice(0, 5).map((r) => (
                <li key={r.checkId} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{r.previousStatus}</span>
                  <ChevronRight className="size-3 opacity-60" />
                  <span className="font-mono text-xs font-semibold text-orange-700 dark:text-orange-300">{r.currentStatus}</span>
                  <span>{r.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Action plan */}
        {report.actionPlan && report.actionPlan.length > 0 && (
          <section className="mb-8 rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Target className="size-5 text-primary" />
              <h2 className="text-xl font-semibold">Plan d&apos;action prioritaire</h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{planSummary(report.actionPlan)}</p>
            <ol className="space-y-2">
              {report.actionPlan.map((item, i) => (
                <ActionRow
                  key={item.checkId}
                  index={i + 1}
                  item={item}
                  expanded={!!expanded[item.checkId]}
                  onToggle={() => setExpanded((e) => ({ ...e, [item.checkId]: !e[item.checkId] }))}
                />
              ))}
            </ol>
          </section>
        )}

        {/* SEO threat model */}
        {report.threatModel && report.threatModel.length > 0 && (
          <section className="mb-8 rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              <h2 className="text-xl font-semibold">
                Risques SEO spécifiques
                {report.stack?.primaryFramework && ` (${report.stack.primaryFramework})`}
              </h2>
            </div>
            <div className="space-y-3">
              {report.threatModel.map((t) => (
                <ThreatCard key={t.id} threat={t} />
              ))}
            </div>
          </section>
        )}

        {/* Compliance */}
        <ComplianceSection checks={report.checks} />

        {/* Checks by category */}
        <ChecksByCategory checks={report.checks} />

        {/* Badge + share */}
        <section className="mt-10 rounded-lg border bg-card p-6">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold">
            <Scale className="size-5 text-primary" />
            Partager / afficher votre badge
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Intégrez ce badge dynamique sur votre site ou votre README. Il se met à jour automatiquement à chaque nouvel audit.
          </p>
          <div className="mb-4 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={badgeUrl} alt="seo audit badge" className="h-5" />
          </div>
          <div className="space-y-2">
            <SnippetRow label="URL" value={pageUrl} copied={copiedBadge === "url"} onCopy={() => copy(pageUrl, "url")} />
            <SnippetRow label="Markdown" value={markdownBadge} copied={copiedBadge === "md"} onCopy={() => copy(markdownBadge, "md")} />
            <SnippetRow label="HTML" value={htmlBadge} copied={copiedBadge === "html"} onCopy={() => copy(htmlBadge, "html")} />
          </div>
        </section>
      </div>
    </main>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function ScoreRing({ score, grade, colorClass }: { score: number; grade: string; colorClass: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative grid size-32 place-items-center">
      <svg className="-rotate-90 size-32" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" className="opacity-10" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" className={colorClass} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-4xl font-black ${colorClass}`}>{grade}</span>
        <span className="text-xs text-muted-foreground">{score}/100</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AuditResult["status"] }) {
  const map = {
    "production-ready": { label: "SEO optimisé", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    "needs-fixes": { label: "À améliorer", cls: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300" },
    "at-risk": { label: "Risque de ranking", cls: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
    critical: { label: "Problèmes critiques", cls: "bg-red-500/15 text-red-700 dark:text-red-300" },
  };
  const s = map[status];
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function MetaRow({ label, value, mono, max }: { label: string; value: string | null | undefined; mono?: boolean; max?: number }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={`flex-1 break-all ${mono ? "font-mono text-xs" : ""}`}>
        {value ? (max && value.length > max ? value.substring(0, max) + "…" : value) : <span className="text-muted-foreground italic">— absent</span>}
      </dd>
    </div>
  );
}

function ActionRow({ index, item, expanded, onToggle }: { index: number; item: ActionItem; expanded: boolean; onToggle: () => void }) {
  const severityColor: Record<string, string> = {
    critical: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
    high: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
    medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
    low: "bg-muted text-muted-foreground border-muted",
    info: "bg-muted text-muted-foreground border-muted",
  };
  return (
    <li className="rounded-md border">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-muted/50">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index}</span>
        <div className="flex-1">
          <div className="font-medium">{item.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className={`rounded border px-1.5 py-0.5 ${severityColor[item.severity]}`}>{item.severity}</span>
            <span className="inline-flex items-center gap-1"><Clock className="size-3" />~{item.effortMinutes} min</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">+{item.pointsGained.toFixed(1)} pts</span>
          </div>
        </div>
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </button>
      {expanded && (
        <div className="border-t bg-muted/20 p-3 text-sm">
          {item.recommendation && <p className="mb-3 whitespace-pre-line">{item.recommendation}</p>}
          {item.stackRemediation && (
            <pre className="overflow-x-auto rounded bg-background p-3 text-xs"><code>{item.stackRemediation.code}</code></pre>
          )}
        </div>
      )}
    </li>
  );
}

function ThreatCard({ threat }: { threat: ThreatVector }) {
  const sev: Record<string, string> = {
    critical: "border-red-500/50 bg-red-500/5",
    high: "border-orange-500/50 bg-orange-500/5",
    medium: "border-yellow-500/50 bg-yellow-500/5",
    low: "border-muted bg-muted/20",
    info: "border-muted bg-muted/20",
  };
  return (
    <div className={`rounded-md border p-4 ${sev[threat.severity]}`}>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide opacity-70">{threat.severity}</span>
        <h3 className="font-semibold">{threat.title}</h3>
      </div>
      <p className="mb-2 text-sm text-muted-foreground">{threat.description}</p>
      <details className="text-sm">
        <summary className="cursor-pointer font-medium hover:text-primary">Mitigations</summary>
        <ul className="mt-2 list-inside list-disc space-y-1 pl-2 text-muted-foreground">
          {threat.mitigations.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      </details>
    </div>
  );
}

function ComplianceSection({ checks }: { checks: AuditCheck[] }) {
  const byFramework = new Map<string, Set<string>>();
  for (const c of checks) {
    if (c.status !== "fail" || !c.compliance) continue;
    for (const ref of c.compliance) {
      const existing = byFramework.get(ref.framework) ?? new Set<string>();
      existing.add(ref.clause);
      byFramework.set(ref.framework, existing);
    }
  }
  if (byFramework.size === 0) return null;
  return (
    <section className="mb-8 rounded-lg border bg-card p-6">
      <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
        <Scale className="size-5 text-primary" />
        Références
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...byFramework.entries()].map(([framework, clauses]) => (
          <div key={framework} className="rounded-md border p-3">
            <div className="mb-1 text-sm font-semibold">{framework}</div>
            <div className="flex flex-wrap gap-1">
              {[...clauses].sort().map((c) => (
                <span key={c} className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{c}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChecksByCategory({ checks }: { checks: AuditCheck[] }) {
  const byCat = new Map<string, AuditCheck[]>();
  for (const c of checks) {
    const arr = byCat.get(c.category) ?? [];
    arr.push(c);
    byCat.set(c.category, arr);
  }
  const labels: Record<string, string> = {
    technical: "Technique",
    onpage: "On-Page",
    performance: "Performance",
    offpage: "Off-Page / E-E-A-T",
  };
  return (
    <section className="mb-8 rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-xl font-semibold">Détail des vérifications</h2>
      <div className="space-y-4">
        {[...byCat.entries()].map(([cat, list]) => (
          <details key={cat} className="rounded border">
            <summary className="flex cursor-pointer items-center justify-between p-3 hover:bg-muted/50">
              <span className="font-medium">{labels[cat] || cat}</span>
              <span className="text-xs text-muted-foreground">
                {list.filter((c) => c.status === "pass").length} pass / {list.filter((c) => c.status === "warn").length} warn / {list.filter((c) => c.status === "fail").length} fail
              </span>
            </summary>
            <div className="space-y-2 p-3 pt-0">
              {list.map((c) => <CheckRow key={c.id} check={c} />)}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function CheckRow({ check }: { check: AuditCheck }) {
  const iconMap = {
    pass: <CheckCircle2 className="size-4 text-emerald-500" />,
    warn: <AlertTriangle className="size-4 text-yellow-500" />,
    fail: <XCircle className="size-4 text-red-500" />,
    info: <Info className="size-4 text-blue-500" />,
  };
  return (
    <div className="flex gap-2 text-sm">
      <span className="mt-0.5 shrink-0">{iconMap[check.status]}</span>
      <div className="flex-1">
        <div className="font-medium">{check.name}</div>
        <p className="text-xs text-muted-foreground">{check.description}</p>
      </div>
    </div>
  );
}

function SnippetRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-xs font-medium text-muted-foreground">{label}</span>
      <code className="flex-1 overflow-x-auto rounded bg-muted px-2 py-1 text-xs">{value}</code>
      <button type="button" onClick={onCopy} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium hover:bg-muted" aria-label={`Copier ${label}`}>
        {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        {copied ? "Copié" : "Copier"}
      </button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function safeHost(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function scoreColorClass(score: number): string {
  if (score >= 85) return "text-emerald-500";
  if (score >= 70) return "text-lime-500";
  if (score >= 55) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function statusSentence(report: AuditResult): string {
  const fails = report.checks.filter((c) => c.status === "fail").length;
  const warns = report.checks.filter((c) => c.status === "warn").length;
  if (report.status === "critical") return `${fails} problème${fails > 1 ? "s" : ""} SEO critique${fails > 1 ? "s" : ""} à corriger (indexation, noindex, mobile-first).`;
  if (report.status === "at-risk") return `${fails} point${fails > 1 ? "s" : ""} à haut risque pour le ranking organique.`;
  if (report.status === "needs-fixes") return `${warns} optimisation${warns > 1 ? "s" : ""} recommandée${warns > 1 ? "s" : ""} pour améliorer le score SEO.`;
  return "Votre site suit les bonnes pratiques SEO modernes.";
}

function planSummary(plan: ActionItem[]): string {
  const totalMinutes = plan.reduce((s, i) => s + i.effortMinutes, 0);
  const totalPoints = plan.reduce((s, i) => s + i.pointsGained, 0);
  const hours = Math.ceil(totalMinutes / 60);
  return `Complétez ces ${plan.length} action${plan.length > 1 ? "s" : ""} (~${hours} h au total) pour gagner environ +${totalPoints.toFixed(0)} points.`;
}
