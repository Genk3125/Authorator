import { NextRequest, NextResponse } from "next/server";
import {
  isUserPasswordSet,
  setPassword,
  verifyPassword,
  createToken,
  addAdminUser,
  getAdminUsers,
} from "@/lib/auth";
import { getRedis } from "@/lib/db/redis";
import { isAnyUserPasswordSet } from "@/lib/db/queries";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const { allowed } = checkRateLimit(`auth:${ip}`);
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

  // --- Initial Setup: first admin ---
  if (action === "setup") {
    const admins = await getAdminUsers();
    if (admins.length > 0) {
      return NextResponse.json(
        { error: "初期セットアップは既に完了しています" },
        { status: 400 }
      );
    }

    if (!initialAdmin || typeof initialAdmin !== "string") {
      return NextResponse.json(
        { error: "管理者の GitHub ユーザー名を入力してください" },
        { status: 400 }
      );
    }

    const username = initialAdmin.replace(/^@/, "").toLowerCase();
    await addAdminUser(username);
    await setPassword(username, password);

    const token = createToken(username);
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

  // --- Normal Login / First-time password setup ---
  // Require OAuth session
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

  const username = githubLogin.toLowerCase();

  // Check if this user has a password set
  const hasPassword = await isUserPasswordSet(username);

  if (!hasPassword) {
    // First login → set their password
    await setPassword(username, password);
  } else {
    // Verify existing password
    const valid = await verifyPassword(username, password);
    if (!valid) {
      return NextResponse.json(
        { error: "パスワードが正しくありません" },
        { status: 401 }
      );
    }
  }

  // Clean up OAuth session
  await redis.del(`oauth:session:${sessionId}`);

  const token = createToken(githubLogin);
  const response = NextResponse.json({ ok: true, github: githubLogin, isNewPassword: !hasPassword });
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
  try {
    const admins = await getAdminUsers();
    const needsSetup = admins.length === 0;
    return NextResponse.json({
      needsSetup,
      hasOAuth: !!process.env.GITHUB_CLIENT_ID,
      adminCount: admins.length,
    });
  } catch (error) {
    console.error("Auth GET error (Redis may not be configured):", error);
    return NextResponse.json({
      needsSetup: true,
      hasOAuth: !!process.env.GITHUB_CLIENT_ID,
      adminCount: 0,
      redisError: true,
    });
  }
}
