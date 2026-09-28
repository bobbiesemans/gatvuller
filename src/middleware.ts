import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

/** `?lang=` becomes the NEXT_LOCALE cookie and disappears from the URL. Paths stay unprefixed. */
export function middleware(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang");
  if (!lang || !isLocale(lang)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.searchParams.delete("lang");
  const response = NextResponse.redirect(url);
  response.cookies.set(LOCALE_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
