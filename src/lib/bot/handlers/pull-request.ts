import { Octokit } from "octokit";
import { getRepoConfig } from "@/lib/db/queries";
import { addActionLog } from "@/lib/db/queries";
import { isBranchProtected, isAuthorizedUser } from "../permissions";
import { revertMerge } from "../actions/revert";
import {
  postIssueComment,
  buildRevertMessage,
} from "../actions/comment";

interface PullRequestEvent {
  action: string;
  pull_request: {
    number: number;
    merged: boolean;
    merged_by: { login: string } | null;
    merge_commit_sha: string | null;
    base: {
      ref: string;
      sha: string;
    };
    head: {
      ref: string;
    };
  };
  repository: {
    owner: { login: string };
    name: string;
  };
  sender: { login: string };
}

export async function handlePullRequest(
  octokit: Octokit,
  payload: PullRequestEvent
): Promise<{ action: string; skipped?: boolean }> {
  if (payload.action !== "closed" || !payload.pull_request.merged) {
    return { action: "not_merged", skipped: true };
  }

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const pr = payload.pull_request;
  const baseBranch = pr.base.ref;
  const mergedBy = pr.merged_by?.login || payload.sender.login;

  const config = await getRepoConfig(owner, repo);
  if (!config || !config.enabled) {
    return { action: "no_config", skipped: true };
  }

  if (!isBranchProtected(config, baseBranch)) {
    return { action: "not_protected", skipped: true };
  }

  if (isAuthorizedUser(config, mergedBy)) {
    await addActionLog(owner, repo, {
      repo: `${owner}/${repo}`,
      action: "allowed",
      user: mergedBy,
      branch: baseBranch,
      reason: "権限者によるマージ",
      commitSha: pr.merge_commit_sha || undefined,
    });
    return { action: "allowed" };
  }

  // Get the parent of the merge commit (= pre-merge state of base branch)
  const mergeCommitSha = pr.merge_commit_sha;
  if (!mergeCommitSha) {
    return { action: "error_no_merge_sha", skipped: true };
  }

  const { data: mergeCommit } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: mergeCommitSha,
  });

  // First parent of a merge commit is the base branch's previous HEAD
  const preMergeSha = mergeCommit.parents[0]?.sha;
  if (!preMergeSha) {
    return { action: "error_no_parent", skipped: true };
  }

  await revertMerge(octokit, owner, repo, baseBranch, preMergeSha);

  const message = buildRevertMessage("revert_merge", mergedBy, baseBranch);
  await postIssueComment(octokit, owner, repo, pr.number, message);

  await addActionLog(owner, repo, {
    repo: `${owner}/${repo}`,
    action: "revert_merge",
    user: mergedBy,
    branch: baseBranch,
    reason: `非権限者 ${mergedBy} による保護ブランチ ${baseBranch} へのマージをリバート`,
    commitSha: mergeCommitSha,
  });

  return { action: "reverted" };
}
