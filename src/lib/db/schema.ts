export interface UserPermission {
  allowedBranches: string[];
  canCreateBranch: boolean;
}

export interface RepoConfig {
  owner: string;
  repo: string;
  enabled: boolean;
  protectedBranches: string[];
  authorizedUsers: string[];
  userPermissions: Record<string, UserPermission>;
}

export interface ActionLog {
  id: string;
  timestamp: string;
  repo: string;
  action: "revert_push" | "revert_merge" | "delete_branch" | "allowed";
  user: string;
  branch: string;
  reason: string;
  commitSha?: string;
}

export function defaultRepoConfig(owner: string, repo: string): RepoConfig {
  return {
    owner,
    repo,
    enabled: true,
    protectedBranches: ["main"],
    authorizedUsers: [],
    userPermissions: {},
  };
}
