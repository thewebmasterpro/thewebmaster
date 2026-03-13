import type { Metadata } from "next";
import PerformanceAuditClient from "./PerformanceAuditClient";

export const metadata: Metadata = {
  title: "Performance Audit Tool | The Webmaster",
  robots: { index: false, follow: false },
};

export default async function PerformanceAuditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PerformanceAuditClient locale={locale} />;
}
