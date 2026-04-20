import { NextRequest, NextResponse } from "next/server";
import { upsertMonitorSubscription } from "@/lib/db";
import { verifyCsrf } from "@/lib/csrf";

export const dynamic = "force-dynamic";

interface SubscribeBody {
  email?: string;
  siteUrl?: string;
}

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "CSRF invalide" }, { status: 403 });
  }
  try {
    const body = (await request.json()) as SubscribeBody;
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }
    if (!body.siteUrl) {
      return NextResponse.json({ error: "URL manquante" }, { status: 400 });
    }
    const sub = upsertMonitorSubscription({
      email: body.email,
      siteUrl: body.siteUrl,
      auditType: "seo",
    });
    return NextResponse.json({ ok: true, subscriptionId: sub.id });
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}
