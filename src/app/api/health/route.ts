import { NextResponse } from "next/server";
import { getRedis } from "@/lib/db/redis";

export async function GET() {
  const checks: Record<string, string> = {
    app: "ok",
    redis: "unknown",
    github_app: "unknown",
  };

  // Redis check
  try {
    const redis = getRedis();
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }

  // GitHub App config check
  checks.github_app =
    process.env.APP_ID && process.env.PRIVATE_KEY ? "configured" : "missing";

  const allOk = checks.redis === "ok" && checks.github_app === "configured";

  return NextResponse.json(
    { status: allOk ? "healthy" : "degraded", checks },
    { status: allOk ? 200 : 503 }
  );
}
