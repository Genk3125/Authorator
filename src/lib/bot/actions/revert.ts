import { Octokit } from "octokit";

export async function revertPush(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  beforeSha: string
): Promise<void> {
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: beforeSha,
    force: true,
  });
}

export async function revertMerge(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  beforeSha: string
): Promise<void> {
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: beforeSha,
    force: true,
  });
}
