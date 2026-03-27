import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/bot/verify-webhook";
import { getInstallationOctokit } from "@/lib/bot/github";
import { handlePush } from "@/lib/bot/handlers/push";
import { handlePullRequest } from "@/lib/bot/handlers/pull-request";
import { handleCreate } from "@/lib/bot/handlers/create";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");

  // Verify webhook signature
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && !verifyWebhookSignature(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);

  // Skip events from the bot itself
  if (payload.sender?.type === "Bot") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Get installation Octokit
  const installationId = payload.installation?.id;
  if (!installationId) {
    return NextResponse.json(
      { error: "No installation ID" },
      { status: 400 }
    );
  }

  const octokit = await getInstallationOctokit(installationId);

  try {
    let result;

    switch (event) {
      case "push":
        result = await handlePush(octokit, payload);
        break;
      case "pull_request":
        result = await handlePullRequest(octokit, payload);
        break;
      case "create":
        result = await handleCreate(octokit, payload);
        break;
      default:
        result = { action: "ignored", skipped: true };
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
