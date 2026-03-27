import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";

let appOctokit: Octokit | null = null;

export function getAppOctokit(): Octokit {
  if (!appOctokit) {
    appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.APP_ID!,
        privateKey: process.env.PRIVATE_KEY!.replace(/\\n/g, "\n"),
      },
    });
  }
  return appOctokit;
}

export async function getInstallationOctokit(
  installationId: number
): Promise<Octokit> {
  const app = getAppOctokit();
  const { data } = await app.rest.apps.createInstallationAccessToken({
    installation_id: installationId,
  });
  return new Octokit({ auth: data.token });
}
