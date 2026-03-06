import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { verifyCsrf } from "@/lib/csrf";

interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  recaptchaToken: string;
}

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true; // Skip if not configured

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}`,
  });

  const data = await res.json();
  return data.success && data.score >= 0.5;
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

    // Rate limiting: 5 requests per minute per IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { limited } = rateLimit(ip, { max: 5, windowMs: 60_000 });
    if (limited) return rateLimitResponse();

    const body: ContactPayload = await request.json();

    if (!body.name || !body.email || !body.message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!body.email.includes("@") || !body.email.includes(".")) {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 }
      );
    }

    // Verify reCAPTCHA
    if (body.recaptchaToken) {
      const isHuman = await verifyRecaptcha(body.recaptchaToken);
      if (!isHuman) {
        return NextResponse.json(
          { error: "reCAPTCHA verification failed" },
          { status: 403 }
        );
      }
    } else if (process.env.RECAPTCHA_SECRET_KEY) {
      return NextResponse.json(
        { error: "reCAPTCHA token missing" },
        { status: 400 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const subjectLine = body.subject
      ? `[TheWebmaster] ${body.subject}`
      : "[TheWebmaster] Nouveau message de contact";

    await resend.emails.send({
      from: "The Webmaster <noreply@thewebmaster.pro>",
      to: ["contact@thewebmaster.pro"],
      replyTo: body.email,
      subject: subjectLine,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #b8860b; border-bottom: 2px solid #b8860b; padding-bottom: 10px;">
            Nouveau message de contact
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #555; width: 100px;">Nom</td>
              <td style="padding: 8px 12px;">${body.name}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 8px 12px; font-weight: bold; color: #555;">Email</td>
              <td style="padding: 8px 12px;"><a href="mailto:${body.email}">${body.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #555;">Sujet</td>
              <td style="padding: 8px 12px;">${body.subject || "Non spécifié"}</td>
            </tr>
          </table>
          <div style="margin-top: 20px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
            <p style="font-weight: bold; color: #555; margin: 0 0 8px;">Message :</p>
            <p style="margin: 0; white-space: pre-wrap;">${body.message}</p>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #999;">
            Envoyé depuis le formulaire de contact de thewebmaster.pro
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Contact] Error sending email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
