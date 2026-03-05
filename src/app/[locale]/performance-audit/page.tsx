import type { Metadata } from "next";
import PerformanceAuditClient from "./PerformanceAuditClient";

export const metadata: Metadata = {
  title: "Performance Audit Tool | The Webmaster",
  robots: { index: false, follow: false },
};

export default function PerformanceAuditPage() {
  return <PerformanceAuditClient />;
}
