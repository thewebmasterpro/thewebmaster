import { NextRequest, NextResponse } from "next/server";
import { getAllLeads, getLeadsStats } from "@/lib/db";

function verifyAdmin(request: NextRequest): boolean {
  const token = request.headers.get("x-admin-token");
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return token === secret;
}

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = getLeadsStats();
  const leads = getAllLeads();

  return NextResponse.json({ stats, leads });
}
