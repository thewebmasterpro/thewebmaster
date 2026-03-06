import { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  "https://thewebmaster.pro",
  "https://www.thewebmaster.pro",
];

if (process.env.NODE_ENV === "development") {
  ALLOWED_ORIGINS.push("http://localhost:3000");
}

export function verifyCsrf(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // At least one must be present
  if (!origin && !referer) return false;

  // Check origin header first (most reliable)
  if (origin) {
    return ALLOWED_ORIGINS.includes(origin);
  }

  // Fallback to referer
  if (referer) {
    return ALLOWED_ORIGINS.some((allowed) => referer.startsWith(allowed));
  }

  return false;
}
