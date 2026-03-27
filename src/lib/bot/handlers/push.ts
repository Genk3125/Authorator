import { Octokit } from "octokit";
import { getRepoConfig } from "@/lib/db/queries";
import { addActionLog } from "@/lib/db/queries";
import { isBranchProtected, canUserPushToBranch } from "../permissions";
import { revertPush } from "../actions/revert";
import {
  postCommitComment,
  buildRevertMessage,
} from "../actions/comment";

const NULL_SHA = "0000000000000000000000000000000000000000";

interface PushEvent {
  ref: string;
  before: string;
  after: string;
  created: boolean;
  deleted: boolean;
  forced: boolean;
  pusher: { name: string };
  sender: { login: string };
  repository: {
    owner: { login: string };
    name: string;
  };
  installation?: { id: number };
}

export async function handlePush(
  octokit: Octokit,
  payload: PushEvent
): Promise<{ action: string; skipped?: boolean }> {
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const branch = payload.ref.replace("refs/heads/", "");
  const username = payload.sender.login;
  const beforeSha = payload.before;
  const afterSha = payload.after;

  // Ignore tag events
  if (!payload.ref.startsWith("refs/heads/")) {
    return { action: "not_branch", skipped: true };
  }

  // Ignore branch deletion events
  if (payload.deleted || afterSha === NULL_SHA) {
    return { action: "branch_deleted", skipped: true };
  }

  const config = await getRepoConfig(owner, repo);
  if (!config || !config.enabled) {
    return { action: "no_config", skipped: true };
  }

  if (!isBranchProtected(config, branch)) {
    return { action: "not_protected", skipped: true };
  }

  if (canUserPushToBranch(config, username, branch)) {
    await addActionLog(owner, repo, {
      repo: `${owner}/${repo}`,
      action: "allowed",
      user: username,
      branch,
      reason: "権限あり",
      commitSha: afterSha,
    });
    return { action: "allowed" };
  }

  // New branch push (before is null SHA) — can't revert, need to delete
  if (payload.created || beforeSha === NULL_SHA) {
    try {
      await octokit.rest.git.deleteRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
    } catch (err) {
      console.error(`Failed to delete new protected branch ${branch}:`, err);
    }

    await addActionLog(owner, repo, {
      repo: `${owner}/${repo}`,
      action: "revert_push",
      user: username,
      branch,
      reason: `非権限者 ${username} が保護ブランチ ${branch} を新規作成 → 削除`,
      commitSha: afterSha,
    });

    return { action: "deleted_new_protected_branch" };
  }

  // Revert unauthorized push
  try {
    await revertPush(octokit, owner, repo, branch, beforeSha);
  } catch (err) {
    console.error(`Failed to revert push on ${branch}:`, err);
    throw err;
  }

  try {
    const message = buildRevertMessage("revert_push", username, branch);
    await postCommitComment(octokit, owner, repo, afterSha, message);
  } catch (err) {
    // Comment failure is not critical
    console.error(`Failed to post comment for revert on ${branch}:`, err);
  }

  await addActionLog(owner, repo, {
    repo: `${owner}/${repo}`,
    action: "revert_push",
    user: username,
    branch,
    reason: `非権限者 ${username} による保護ブランチ ${branch} への push をリバート`,
    commitSha: afterSha,
  });

  return { action: "reverted" };
}
