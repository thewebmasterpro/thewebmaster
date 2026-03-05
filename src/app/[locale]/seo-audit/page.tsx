import type { Metadata } from "next";
import SeoAuditClient from "./SeoAuditClient";

export const metadata: Metadata = {
  title: "SEO Audit Tool | The Webmaster",
  robots: { index: false, follow: false },
};

export default function SeoAuditPage() {
  return <SeoAuditClient />;
}
