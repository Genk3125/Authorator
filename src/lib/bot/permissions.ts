import { minimatch } from "minimatch";
import { RepoConfig } from "@/lib/db/schema";

export function isBranchProtected(
  config: RepoConfig,
  branch: string
): boolean {
  return config.protectedBranches.some((pattern) =>
    minimatch(branch, pattern)
  );
}

export function isAuthorizedUser(
  config: RepoConfig,
  username: string
): boolean {
  return config.authorizedUsers.includes(username);
}

export function canUserPushToBranch(
  config: RepoConfig,
  username: string,
  branch: string
): boolean {
  if (isAuthorizedUser(config, username)) return true;

  const perms = config.userPermissions[username];
  if (!perms) return false;

  return perms.allowedBranches.some((pattern) => minimatch(branch, pattern));
}

export function canUserCreateBranch(
  config: RepoConfig,
  username: string
): boolean {
  if (isAuthorizedUser(config, username)) return true;

  const perms = config.userPermissions[username];
  if (!perms) return false;

  return perms.canCreateBranch;
}
