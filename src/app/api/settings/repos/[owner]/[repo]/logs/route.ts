import { NextRequest, NextResponse } from "next/server";
import { getActionLogs } from "@/lib/db/queries";

type Params = { params: Promise<{ owner: string; repo: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { owner, repo } = await params;
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const logs = await getActionLogs(owner, repo, Math.min(limit, 200));
  return NextResponse.json({ logs });
}
