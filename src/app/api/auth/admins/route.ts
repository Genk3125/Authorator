import { NextRequest, NextResponse } from "next/server";
import { getAdminUsers, addAdminUser, removeAdminUser } from "@/lib/auth";

export async function GET() {
  const users = await getAdminUsers();
  return NextResponse.json({ admins: users });
}

export async function POST(request: NextRequest) {
  const { username } = await request.json();
  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "ユーザー名は必須です" }, { status: 400 });
  }
  await addAdminUser(username.replace(/^@/, ""));
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
