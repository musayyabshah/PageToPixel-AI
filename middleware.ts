import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_TOKEN } from "./lib/config";

const PUBLIC_PATHS = ["/unlock", "/api/auth/login", "/_next", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token === SESSION_TOKEN) {
    return NextResponse.next();
  }

  const url = new URL("/unlock", request.url);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"]
};
