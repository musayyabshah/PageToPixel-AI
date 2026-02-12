import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { APP_PASSWORD, SESSION_COOKIE_NAME } from "./lib/config";

function expectedToken(): string {
  return createHash("sha256").update(APP_PASSWORD).digest("hex");
}

const PUBLIC_PATHS = ["/unlock", "/api/auth/login", "/_next", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token === expectedToken()) {
    return NextResponse.next();
  }

  const url = new URL("/unlock", request.url);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"]
};
