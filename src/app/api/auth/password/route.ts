import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, setPassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function PUT(request: NextRequest) {
  // Must be authenticated (checked by cookie in middleware via dashboard route)
  const token = request.cookies.get("authrator_token")?.value;
  if (!token) {
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

  const valid = await verifyPassword(currentPassword);
  if (!valid) {
    return NextResponse.json(
      { error: "現在のパスワードが正しくありません" },
      { status: 401 }
    );
  }

  await setPassword(newPassword);
  return NextResponse.json({ ok: true });
}
