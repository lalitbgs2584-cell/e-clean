import { NextResponse, type NextRequest } from "next/server";

const sessionCookieNames = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

function hasSession(request: NextRequest) {
  return sessionCookieNames.some((name) => request.cookies.has(name));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionExists = hasSession(request);

  if (pathname === "/dashboard" && !sessionExists) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("access", "authority");
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === "/login" || pathname === "/register") && sessionExists) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/login", "/register"],
};
