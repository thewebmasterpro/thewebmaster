import { NextRequest, NextResponse } from "next/server";
import { getAuditReport } from "@/lib/db";

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "#10b981";
  if (grade === "B") return "#84cc16";
  if (grade === "C") return "#eab308";
  if (grade === "D") return "#f97316";
  return "#ef4444";
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cleanId = id.replace(/\.svg$/i, "");
  if (!/^[a-z0-9]{6,32}$/i.test(cleanId)) {
    return new NextResponse("Invalid id", { status: 400 });
  }

  const stored = getAuditReport(cleanId);
  const label = "performance";
  if (!stored || stored.auditType !== "performance") {
    return new NextResponse(renderBadge(label, "unknown", "#6b7280"), {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  const value = `${escapeXml(stored.grade)} · ${stored.score}/100`;
  const color = gradeColor(stored.grade);
  return new NextResponse(renderBadge(label, value, color), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, stale-while-revalidate=86400",
    },
  });
}

function renderBadge(label: string, value: string, color: string): string {
  const charW = 6.6;
  const padding = 10;
  const labelWidth = Math.ceil(label.length * charW) + padding * 2;
  const valueWidth = Math.ceil(value.length * charW) + padding * 2;
  const totalWidth = labelWidth + valueWidth;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${escapeXml(label)}: ${escapeXml(value)}">
  <title>${escapeXml(label)}: ${escapeXml(value)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity="0.12"/>
    <stop offset="1" stop-opacity="0.12"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity="0.3">${escapeXml(label)}</text>
    <text x="${labelWidth / 2}" y="14">${escapeXml(label)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity="0.3">${escapeXml(value)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${escapeXml(value)}</text>
  </g>
</svg>`;
}
