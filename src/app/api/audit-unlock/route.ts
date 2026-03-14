import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { verifyCsrf } from "@/lib/csrf";
import { insertAuditLead } from "@/lib/db";
import {
  getAuditEmailSubject,
  getAuditEmailHtml,
} from "@/lib/email-templates/audit-report";

interface UnlockPayload {
  email: string;
  siteUrl: string;
  auditType: "seo" | "performance" | "security";
  score: number;
  grade: string;
  locale: string;
  reportText: string;
}

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    if (!verifyCsrf(request)) {
      return NextResponse.json(
        { error: "Invalid request origin" },
        { status: 403 }
      );
    }

    // Rate limiting: 10 requests per minute per IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const { limited } = rateLimit(ip, { max: 10, windowMs: 60_000 });
    if (limited) return rateLimitResponse();

    const body: UnlockPayload = await request.json();

    // Validate required fields
    if (!body.email || !body.siteUrl || !body.auditType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Basic email validation
    if (!body.email.includes("@") || !body.email.includes(".")) {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 }
      );
    }

    // Validate audit type
    if (!["seo", "performance", "security"].includes(body.auditType)) {
      return NextResponse.json(
        { error: "Invalid audit type" },
        { status: 400 }
      );
    }

    const locale = body.locale || "fr";
    const score = body.score ?? 0;
    const grade = body.grade || "?";

    // Extract hostname from siteUrl
    let hostname: string;
    try {
      const urlObj = new URL(
        body.siteUrl.startsWith("http")
          ? body.siteUrl
          : `https://${body.siteUrl}`
      );
      hostname = urlObj.hostname;
    } catch {
      hostname = body.siteUrl;
    }

    // Save lead
    const leadId = insertAuditLead({
      email: body.email,
      siteUrl: body.siteUrl,
      auditType: body.auditType,
      score,
      grade,
      locale,
      ipAddress: ip,
    });

    // Send email with full report (non-blocking — unlock works even if email fails)
    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
      try {
        const subject = getAuditEmailSubject({
          hostname,
          auditType: body.auditType,
          score,
          grade,
          locale,
        });

        const html = getAuditEmailHtml({
          hostname,
          auditType: body.auditType,
          score,
          grade,
          locale,
          reportText: body.reportText || "",
        });

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "The Webmaster <noreply@thewebmaster.pro>",
            to: [body.email],
            subject,
            html,
          }),
        });
        emailSent = emailRes.ok;
      } catch (emailError) {
        console.error("[AuditUnlock] Email send failed:", emailError);
      }
    }

    return NextResponse.json({ unlocked: true, leadId, emailSent });
  } catch (error) {
    console.error("[AuditUnlock] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
