import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, setPassword, verifyToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function PUT(request: NextRequest) {
  const token = request.cookies.get("authrator_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get username from JWT
  const { valid, github } = verifyToken(token);
  if (!valid || !github) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const { allowed } = checkRateLimit(`pw-change:${ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "試行回数が多すぎます" },
      { status: 429 }
    );
  }

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "現在のパスワードと新しいパスワードを入力してください" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "パスワードは8文字以上にしてください" },
      { status: 400 }
    );
  }

  const username = github.toLowerCase();
  const isValid = await verifyPassword(username, currentPassword);
  if (!isValid) {
    return NextResponse.json(
      { error: "現在のパスワードが正しくありません" },
      { status: 401 }
    );
  }

  await setPassword(username, newPassword);
  return NextResponse.json({ ok: true });
}
