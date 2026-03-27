import { NextRequest, NextResponse } from "next/server";
import {
  isPasswordSet,
  setPassword,
  verifyPassword,
  createToken,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password, action } = body;

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

  // Initial setup
  if (action === "setup" && !hasPassword) {
    await setPassword(password);
    const token = createToken();
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

  // Login
  const valid = await verifyPassword(password);
  if (!valid) {
    return NextResponse.json(
      { error: "パスワードが正しくありません" },
      { status: 401 }
    );
  }

  const token = createToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set("authrator_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  return response;
}

export async function GET() {
  const hasPassword = await isPasswordSet();
  return NextResponse.json({ needsSetup: !hasPassword });
}
