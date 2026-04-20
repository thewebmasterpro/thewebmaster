import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAuditReport } from "@/lib/db";
import type { AuditResult } from "@/types/audit";
import PublicPerfReportClient from "./PublicPerfReportClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const stored = getAuditReport(id);
  if (!stored || stored.auditType !== "performance") {
    return { title: "Rapport de performance introuvable | The Webmaster" };
  }
  const report = stored.report as AuditResult;
  const host = safeHost(report.url);
  return {
    title: `Audit performance de ${host} — note ${report.grade} (${report.score}/100) | The Webmaster`,
    description: `Rapport de performance pour ${host}. Score ${report.score}/100, grade ${report.grade}. Core Web Vitals réels.`,
    openGraph: {
      title: `Performance de ${host} — ${report.grade}`,
      description: `Score ${report.score}/100. Généré par The Webmaster.`,
      url: `/performance-audit/r/${id}`,
    },
    robots: { index: true, follow: true },
  };
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default async function PublicPerfReportPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const stored = getAuditReport(id);
  if (!stored || stored.auditType !== "performance") notFound();
  return (
    <PublicPerfReportClient
      id={id}
      locale={locale}
      createdAt={stored.createdAt}
      report={stored.report as AuditResult}
    />
  );
}
