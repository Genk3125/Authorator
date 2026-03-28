import { NextRequest, NextResponse } from "next/server";
import { getAdminUsers, addAdminUser, removeAdminUser } from "@/lib/auth";

export async function GET() {
  try {
    const users = await getAdminUsers();
    return NextResponse.json({ admins: users });
  } catch (error) {
    console.error("Failed to get admin users:", error);
    return NextResponse.json({ admins: [], error: "Redis 接続エラー" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const { username } = await request.json();
  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "ユーザー名は必須です" }, { status: 400 });
  }

  const cleanName = username.replace(/^@/, "").trim();

  // Verify the GitHub user actually exists
  const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanName)}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!ghRes.ok) {
    return NextResponse.json(
      { error: `GitHub ユーザー @${cleanName} が見つかりません` },
      { status: 404 }
    );
  }

  await addAdminUser(cleanName);
  const users = await getAdminUsers();
  return NextResponse.json({ admins: users });
}

export async function DELETE(request: NextRequest) {
  const { username } = await request.json();
  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "ユーザー名は必須です" }, { status: 400 });
  }

  const users = await getAdminUsers();
  if (users.length <= 1) {
    return NextResponse.json(
      { error: "管理者は最低1人必要です" },
      { status: 400 }
    );
  }

  await removeAdminUser(username);
  const updated = await getAdminUsers();
  return NextResponse.json({ admins: updated });
}
