import type { Metadata } from "next";
import SeoAuditClient from "./SeoAuditClient";

export const metadata: Metadata = {
  title: "SEO Audit Tool | The Webmaster",
  robots: { index: false, follow: false },
};

export default async function SeoAuditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <SeoAuditClient locale={locale} />;
}
