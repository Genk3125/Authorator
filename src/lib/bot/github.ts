import { App, Octokit } from "octokit";

let app: App | null = null;

function getApp(): App {
  if (!app) {
    const appId = process.env.APP_ID;
    const privateKey = process.env.PRIVATE_KEY;

    if (!appId || !privateKey) {
      throw new Error("APP_ID and PRIVATE_KEY must be set");
    }

    app = new App({
      appId,
      privateKey: privateKey.replace(/\\n/g, "\n"),
      webhooks: {
        secret: process.env.WEBHOOK_SECRET || "unused",
      },
    });
  }
  return app;
}

export async function getInstallationOctokit(
  installationId: number
): Promise<Octokit> {
  const githubApp = getApp();
  return githubApp.getInstallationOctokit(installationId);
}
