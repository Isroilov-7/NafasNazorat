import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/auth/token";

/**
 * Optimistic auth gate: unauthenticated visitors to app routes are sent to
 * /login before any rendering. The real check happens again in the DAL
 * (lib/server/auth/dal.ts) for every page and server action.
 */
export function proxy(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname, search } = request.nextUrl;

  if (pathname === "/login") {
    return session ? NextResponse.redirect(new URL("/dashboard", request.url)) : NextResponse.next();
  }
  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/patients/:path*", "/assessments/:path*", "/spirometry/:path*", "/admin/:path*", "/design-system/:path*", "/api/research-export/:path*"],
};
