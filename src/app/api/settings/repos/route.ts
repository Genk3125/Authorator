import { NextRequest, NextResponse } from "next/server";
import { listRepos, getRepoConfig, setRepoConfig } from "@/lib/db/queries";
import { defaultRepoConfig, RepoConfig } from "@/lib/db/schema";

export async function GET() {
  try {
    const repoKeys = await listRepos();
    const configs: RepoConfig[] = [];

    for (const key of repoKeys) {
      const [owner, repo] = key.split("/");
      const config = await getRepoConfig(owner, repo);
      if (config) configs.push(config);
    }

    return NextResponse.json({ repos: configs });
  } catch (error) {
    console.error("Failed to list repos:", error);
    return NextResponse.json({ repos: [], error: "Redis 接続エラー" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { owner, repo } = body;

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "owner と repo は必須です" },
      { status: 400 }
    );
  }

  try {
    const existing = await getRepoConfig(owner, repo);
    if (existing) {
      return NextResponse.json(
        { error: "このリポジトリは既に登録されています" },
        { status: 409 }
      );
    }

    const config = defaultRepoConfig(owner, repo);
    await setRepoConfig(config);

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    console.error("Failed to add repo:", error);
    return NextResponse.json({ error: "Redis 接続エラー" }, { status: 503 });
  }
}
