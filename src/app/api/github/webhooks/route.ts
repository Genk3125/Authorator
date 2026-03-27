import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/bot/verify-webhook";
import { getInstallationOctokit } from "@/lib/bot/github";
import { handlePush } from "@/lib/bot/handlers/push";
import { handlePullRequest } from "@/lib/bot/handlers/pull-request";
import { handleCreate } from "@/lib/bot/handlers/create";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");
  const deliveryId = request.headers.get("x-github-delivery");

  // Verify webhook signature (required in production)
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error("WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (!verifyWebhookSignature(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Skip events from bots (including our own app)
  const senderType = payload.sender?.type;
  const senderLogin = payload.sender?.login;
  if (senderType === "Bot" || senderLogin?.endsWith("[bot]")) {
    return NextResponse.json({ ok: true, skipped: true, reason: "bot_sender" });
  }

  // Ping event (sent on webhook creation)
  if (event === "ping") {
    return NextResponse.json({ ok: true, event: "ping" });
  }

  // Get installation Octokit
  const installationId = payload.installation?.id;
  if (!installationId) {
    return NextResponse.json({ error: "No installation ID" }, { status: 400 });
  }

  let octokit;
  try {
    octokit = await getInstallationOctokit(installationId);
  } catch (error) {
    console.error("Failed to get installation token:", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }

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

    return NextResponse.json({ ok: true, delivery: deliveryId, ...result });
  } catch (error) {
    console.error(`Webhook handler error [${event}] [${deliveryId}]:`, error);
    return NextResponse.json(
      { error: "Handler failed", event, delivery: deliveryId },
      { status: 500 }
    );
  }
}
