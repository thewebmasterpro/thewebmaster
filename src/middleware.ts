import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "@/lib/i18n/config";

function getLocaleFromCookie(request: NextRequest): string | null {
  return request.cookies.get("NEXT_LOCALE")?.value || null;
}

function getLocaleFromHeader(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language") || "";
  for (const locale of locales) {
    if (acceptLanguage.includes(locale)) {
      return locale;
    }
  }
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public files, API routes, Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/images") ||
    pathname.includes(".") // static files (.ico, .svg, etc.)
  ) {
    return NextResponse.next();
  }

  // Check if pathname already has a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  // Determine locale
  const cookieLocale = getLocaleFromCookie(request);
  const locale =
    cookieLocale && locales.includes(cookieLocale as typeof locales[number])
      ? cookieLocale
      : getLocaleFromHeader(request);

  // Redirect to locale-prefixed path
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|api|images|.*\\..*).*)"],
};
