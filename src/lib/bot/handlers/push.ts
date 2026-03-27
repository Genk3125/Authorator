import { Octokit } from "octokit";
import { getRepoConfig } from "@/lib/db/queries";
import { addActionLog } from "@/lib/db/queries";
import { isBranchProtected, canUserPushToBranch } from "../permissions";
import { revertPush } from "../actions/revert";
import {
  postCommitComment,
  buildRevertMessage,
} from "../actions/comment";

interface PushEvent {
  ref: string;
  before: string;
  after: string;
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

  // Ignore branch deletion events (after is all zeros)
  if (afterSha === "0000000000000000000000000000000000000000") {
    return { action: "ignored", skipped: true };
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

  // Revert unauthorized push
  await revertPush(octokit, owner, repo, branch, beforeSha);

  const message = buildRevertMessage("revert_push", username, branch);
  await postCommitComment(octokit, owner, repo, afterSha, message);

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
