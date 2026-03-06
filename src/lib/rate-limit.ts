import { NextResponse } from "next/server";

// In-memory rate limiter (resets on server restart)
const requests = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs?: number; // Time window in ms (default: 60s)
  max?: number; // Max requests per window (default: 10)
}

export function rateLimit(
  ip: string,
  { windowMs = 60_000, max = 10 }: RateLimitOptions = {}
): { limited: boolean; remaining: number } {
  const now = Date.now();
  const entry = requests.get(ip);

  if (!entry || now > entry.resetTime) {
    requests.set(ip, { count: 1, resetTime: now + windowMs });
    return { limited: false, remaining: max - 1 };
  }

  entry.count++;
  if (entry.count > max) {
    return { limited: true, remaining: 0 };
  }

  return { limited: false, remaining: max - entry.count };
}

export function rateLimitResponse() {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": "60" },
    }
  );
}

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requests) {
      if (now > value.resetTime) {
        requests.delete(key);
      }
    }
  }, 5 * 60_000);
}
