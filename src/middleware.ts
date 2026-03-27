import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next();

  // Security headers for all responses
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Protected routes: dashboard, settings API, admin API
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/settings") ||
    pathname.startsWith("/api/auth/admins")
  ) {
    const token = request.cookies.get("authrator_token")?.value;
    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("Invalid token");
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error("Token expired");
      }
    } catch {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const redirect = NextResponse.redirect(new URL("/login", request.url));
      redirect.cookies.delete("authrator_token");
      return redirect;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/settings/:path*",
    "/api/auth/admins",
    "/api/github/webhooks",
  ],
};
