import { NextRequest, NextResponse } from "next/server";
import {
  isPasswordSet,
  setPassword,
  verifyPassword,
  createToken,
  addAdminUser,
  getAdminUsers,
} from "@/lib/auth";
import { getRedis } from "@/lib/db/redis";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const { allowed, remaining } = checkRateLimit(`auth:${ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "試行回数が多すぎます。15分後に再試行してください" },
      { status: 429, headers: { "Retry-After": "900" } }
    );
  }

  const body = await request.json();
  const { password, action, initialAdmin } = body;

  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "パスワードを入力してください" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "パスワードは8文字以上にしてください" },
      { status: 400 }
    );
  }

  const hasPassword = await isPasswordSet();

  // Initial setup: set password + first admin user
  if (action === "setup" && !hasPassword) {
    await setPassword(password);

    // Register initial admin GitHub user
    if (initialAdmin && typeof initialAdmin === "string") {
      await addAdminUser(initialAdmin.replace(/^@/, ""));
    }

    const token = createToken(initialAdmin || "setup");
    const response = NextResponse.json({ ok: true, setup: true });
    response.cookies.set("authrator_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    return response;
  }

  // Normal login: verify password + check OAuth session
  const valid = await verifyPassword(password);
  if (!valid) {
    return NextResponse.json(
      { error: "パスワードが正しくありません" },
      { status: 401 }
    );
  }

  // Check for OAuth session (GitHub login must be verified first)
  const sessionId = request.cookies.get("authrator_oauth_session")?.value;
  if (!sessionId) {
    return NextResponse.json(
      { error: "先に GitHub でログインしてください" },
      { status: 401 }
    );
  }

  const redis = getRedis();
  const githubLogin = await redis.get<string>(`oauth:session:${sessionId}`);
  if (!githubLogin) {
    return NextResponse.json(
      { error: "GitHub セッションが期限切れです。もう一度 GitHub ログインしてください" },
      { status: 401 }
    );
  }

  // Clean up OAuth session
  await redis.del(`oauth:session:${sessionId}`);

  const token = createToken(githubLogin);
  const response = NextResponse.json({ ok: true, github: githubLogin });
  response.cookies.set("authrator_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  response.cookies.delete("authrator_oauth_session");
  return response;
}

export async function GET() {
  const hasPassword = await isPasswordSet();
  const adminUsers = await getAdminUsers();
  return NextResponse.json({
    needsSetup: !hasPassword,
    hasOAuth: !!process.env.GITHUB_CLIENT_ID,
    adminCount: adminUsers.length,
  });
}
