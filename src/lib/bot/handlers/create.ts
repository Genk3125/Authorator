import { Octokit } from "octokit";
import { getRepoConfig } from "@/lib/db/queries";
import { addActionLog } from "@/lib/db/queries";
import { canUserCreateBranch } from "../permissions";
import { deleteBranch } from "../actions/delete-branch";
import {
  postCommitComment,
  buildRevertMessage,
} from "../actions/comment";

interface CreateEvent {
  ref: string;
  ref_type: string;
  sender: { login: string };
  repository: {
    owner: { login: string };
    name: string;
  };
}

export async function handleCreate(
  octokit: Octokit,
  payload: CreateEvent
): Promise<{ action: string; skipped?: boolean }> {
  // Only handle branch creation
  if (payload.ref_type !== "branch") {
    return { action: "not_branch", skipped: true };
  }

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const branch = payload.ref;
  const username = payload.sender.login;

  const config = await getRepoConfig(owner, repo);
  if (!config || !config.enabled) {
    return { action: "no_config", skipped: true };
  }

  if (canUserCreateBranch(config, username)) {
    return { action: "allowed" };
  }

  // Delete unauthorized branch
  await deleteBranch(octokit, owner, repo, branch);

  // Post comment on the latest commit of the default branch
  const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
  const { data: ref } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${repoData.default_branch}`,
  });

  const message = buildRevertMessage("delete_branch", username, branch);
  await postCommitComment(octokit, owner, repo, ref.object.sha, message);

  await addActionLog(owner, repo, {
    repo: `${owner}/${repo}`,
    action: "delete_branch",
    user: username,
    branch,
    reason: `非権限者 ${username} によるブランチ ${branch} の作成を削除`,
  });

  return { action: "deleted" };
}
