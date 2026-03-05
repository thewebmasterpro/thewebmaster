import type { Metadata } from "next";
import SecurityAuditClient from "./SecurityAuditClient";

export const metadata: Metadata = {
  title: "Security Audit Tool | The Webmaster",
  robots: { index: false, follow: false },
};

export default function SecurityAuditPage() {
  return <SecurityAuditClient />;
}
