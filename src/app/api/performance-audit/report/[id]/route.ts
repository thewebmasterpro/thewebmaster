import { NextRequest, NextResponse } from "next/server";
import { getAuditReport } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || !/^[a-z0-9]{6,32}$/i.test(id)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }
  const stored = getAuditReport(id);
  if (!stored || stored.auditType !== "performance") {
    return NextResponse.json({ error: "Rapport performance introuvable" }, { status: 404 });
  }
  return NextResponse.json({
    id: stored.id,
    siteUrl: stored.siteUrl,
    createdAt: stored.createdAt,
    auditType: stored.auditType,
    report: stored.report,
  });
}
