import { Octokit } from "octokit";
import { getRepoConfig } from "@/lib/db/queries";
import { addActionLog } from "@/lib/db/queries";
import { canUserCreateBranch } from "../permissions";
import { deleteBranch } from "../actions/delete-branch";
import { buildRevertMessage } from "../actions/comment";

interface CreateEvent {
  ref: string;
  ref_type: string;
  sender: { login: string };
  repository: {
    owner: { login: string };
    name: string;
    default_branch: string;
  };
}

export async function handleCreate(
  octokit: Octokit,
  payload: CreateEvent
): Promise<{ action: string; skipped?: boolean }> {
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
  try {
    await deleteBranch(octokit, owner, repo, branch);
  } catch (err) {
    console.error(`Failed to delete branch ${branch}:`, err);
    throw err;
  }

  // Post a comment on an issue to notify (since the branch no longer exists)
  try {
    const message = buildRevertMessage("delete_branch", username, branch);
    // Create an issue for notification
    const { data: issue } = await octokit.rest.issues.create({
      owner,
      repo,
      title: `[Authorator] ブランチ ${branch} を削除しました`,
      body: message,
      labels: ["authorator"],
    });
    // Close immediately — this is just for notification
    await octokit.rest.issues.update({
      owner,
      repo,
      issue_number: issue.number,
      state: "closed",
    });
  } catch (err) {
    console.error(`Failed to create notification issue for branch ${branch}:`, err);
  }

  await addActionLog(owner, repo, {
    repo: `${owner}/${repo}`,
    action: "delete_branch",
    user: username,
    branch,
    reason: `非権限者 ${username} によるブランチ ${branch} の作成を削除`,
  });

  return { action: "deleted" };
}
