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

export async function PUT(request: NextRequest, { params }: Params) {
  const { owner, repo } = await params;
  const body = await request.json();

  const existing = await getRepoConfig(owner, repo);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
