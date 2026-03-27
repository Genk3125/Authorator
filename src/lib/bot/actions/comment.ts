import { Octokit } from "octokit";

export async function postCommitComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  commitSha: string,
  body: string
): Promise<void> {
  await octokit.rest.repos.createCommitComment({
    owner,
    repo,
    commit_sha: commitSha,
    body,
  });
}

export async function postIssueComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<void> {
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}

export function buildRevertMessage(
  action: "revert_push" | "revert_merge" | "delete_branch",
  username: string,
  branch: string
): string {
  const prefix = "🤖 **Authorator Bot**\n\n";

  switch (action) {
    case "revert_push":
      return (
        prefix +
        `@${username} による保護ブランチ \`${branch}\` への push をリバートしました。\n\n` +
        `**理由:** このユーザーには \`${branch}\` への push 権限がありません。\n` +
        `変更を反映するには、権限者に PR のマージを依頼してください。`
      );
    case "revert_merge":
      return (
        prefix +
        `@${username} による保護ブランチ \`${branch}\` へのマージをリバートしました。\n\n` +
        `**理由:** このユーザーにはマージ権限がありません。\n` +
        `マージは権限者のみが実行できます。`
      );
    case "delete_branch":
      return (
        prefix +
        `@${username} が作成したブランチ \`${branch}\` を削除しました。\n\n` +
        `**理由:** このユーザーにはブランチ作成権限がありません。`
      );
  }
}
