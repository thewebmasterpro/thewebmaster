import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAuditReport } from "@/lib/db";
import type { AuditResult } from "@/types/audit";
import PublicSeoReportClient from "./PublicSeoReportClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const stored = getAuditReport(id);
  if (!stored || stored.auditType !== "seo") {
    return { title: "Rapport SEO introuvable | The Webmaster" };
  }
  const report = stored.report as AuditResult;
  const host = safeHost(report.url);
  return {
    title: `Audit SEO de ${host} — note ${report.grade} (${report.score}/100) | The Webmaster`,
    description: `Rapport d'audit SEO pour ${host}. Score ${report.score}/100, grade ${report.grade}. Audité le ${formatDate(stored.createdAt)}.`,
    openGraph: {
      title: `Audit SEO de ${host} — ${report.grade}`,
      description: `Score SEO ${report.score}/100. Généré par The Webmaster.`,
      url: `/seo-audit/r/${id}`,
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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default async function PublicSeoReportPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const stored = getAuditReport(id);
  if (!stored || stored.auditType !== "seo") notFound();
  return (
    <PublicSeoReportClient
      id={id}
      locale={locale}
      createdAt={stored.createdAt}
      report={stored.report as AuditResult}
    />
  );
}
