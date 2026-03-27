import { Octokit } from "octokit";

export async function deleteBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string
): Promise<void> {
  await octokit.rest.git.deleteRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
}
