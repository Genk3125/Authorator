import { NextRequest, NextResponse } from "next/server";
import {
  getRepoConfig,
  setRepoConfig,
  deleteRepoConfig,
} from "@/lib/db/queries";

type Params = { params: Promise<{ owner: string; repo: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { owner, repo } = await params;
  const config = await getRepoConfig(owner, repo);
  if (!config) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ config });
}

async function verifyGitHubUser(username: string): Promise<boolean> {
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  return res.ok;
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { owner, repo } = await params;
  const body = await request.json();

  const existing = await getRepoConfig(owner, repo);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Validate new authorizedUsers
  if (body.authorizedUsers) {
    const newUsers = (body.authorizedUsers as string[]).filter(
      (u) => !existing.authorizedUsers.includes(u)
    );
    for (const u of newUsers) {
      const exists = await verifyGitHubUser(u);
      if (!exists) {
        return NextResponse.json(
          { error: `GitHub ユーザー @${u} が見つかりません` },
          { status: 404 }
        );
      }
    }
  }

  // Validate new userPermissions users
  if (body.userPermissions) {
    const newPermUsers = Object.keys(body.userPermissions).filter(
      (u) => !existing.userPermissions[u]
    );
    for (const u of newPermUsers) {
      const exists = await verifyGitHubUser(u);
      if (!exists) {
        return NextResponse.json(
          { error: `GitHub ユーザー @${u} が見つかりません` },
          { status: 404 }
        );
      }
    }
  }

  const updated = {
    ...existing,
    ...body,
    owner,
    repo,
  };

  await setRepoConfig(updated);
  return NextResponse.json({ config: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { owner, repo } = await params;
  await deleteRepoConfig(owner, repo);
  return NextResponse.json({ ok: true });
}
