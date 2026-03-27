import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getRedis } from "@/lib/db/redis";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GITHUB_CLIENT_ID が設定されていません" },
      { status: 500 }
    );
  }

  // Generate state for CSRF protection
  const state = randomBytes(16).toString("hex");
  const redis = getRedis();
  await redis.set(`oauth:state:${state}`, "1", { ex: 600 }); // 10 min expiry

  const redirectUri = `${request.nextUrl.origin}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return NextResponse.redirect(url);
}
