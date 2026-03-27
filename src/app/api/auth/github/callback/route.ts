import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getRedis } from "@/lib/db/redis";
import { isAdminUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=missing_params", request.url));
  }

  // Verify state
  const redis = getRedis();
  const storedState = await redis.get(`oauth:state:${state}`);
  if (!storedState) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
  }
  await redis.del(`oauth:state:${state}`);

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  // Get GitHub user info
  const userRes = await fetch("https://github.com/api/v3/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
    },
  });

  const userData = await userRes.json();
  const githubLogin = userData.login as string;

  if (!githubLogin) {
    return NextResponse.redirect(new URL("/login?error=no_user", request.url));
  }

  // Check if user is in admin whitelist
  const isAdmin = await isAdminUser(githubLogin);
  if (!isAdmin) {
    return NextResponse.redirect(
      new URL(`/login?error=not_admin&user=${githubLogin}`, request.url)
    );
  }

  // Store GitHub login in a temporary session, then require password
  const sessionId = randomBytes(16).toString("hex");
  await redis.set(`oauth:session:${sessionId}`, githubLogin, { ex: 600 });

  const response = NextResponse.redirect(new URL("/login?step=password", request.url));
  response.cookies.set("authrator_oauth_session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
