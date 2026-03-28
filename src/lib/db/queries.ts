import { getRedis } from "./redis";
import { RepoConfig, ActionLog, defaultRepoConfig } from "./schema";

const REPO_PREFIX = "repo:";
const LOG_PREFIX = "log:";
const REPO_LIST_KEY = "repos";

// --- Repo Config ---

export async function getRepoConfig(
  owner: string,
  repo: string
): Promise<RepoConfig | null> {
  const redis = getRedis();
  const data = await redis.get<RepoConfig>(`${REPO_PREFIX}${owner}/${repo}`);
  return data;
}

export async function setRepoConfig(config: RepoConfig): Promise<void> {
  const redis = getRedis();
  const key = `${REPO_PREFIX}${config.owner}/${config.repo}`;
  await redis.set(key, config);
  await redis.sadd(REPO_LIST_KEY, `${config.owner}/${config.repo}`);
}

export async function deleteRepoConfig(
  owner: string,
  repo: string
): Promise<void> {
  const redis = getRedis();
  const key = `${REPO_PREFIX}${owner}/${repo}`;
  await redis.del(key);
  await redis.srem(REPO_LIST_KEY, `${owner}/${repo}`);
}

export async function listRepos(): Promise<string[]> {
  const redis = getRedis();
  const repos = await redis.smembers(REPO_LIST_KEY);
  return repos;
}

export async function getOrCreateRepoConfig(
  owner: string,
  repo: string
): Promise<RepoConfig> {
  const existing = await getRepoConfig(owner, repo);
  if (existing) return existing;
  const config = defaultRepoConfig(owner, repo);
  await setRepoConfig(config);
  return config;
}

// --- Action Logs ---

export async function addActionLog(
  owner: string,
  repo: string,
  log: Omit<ActionLog, "id" | "timestamp">
): Promise<void> {
  const redis = getRedis();
  const timestamp = new Date().toISOString();
  const id = `${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
  const entry: ActionLog = { ...log, id, timestamp };
  const key = `${LOG_PREFIX}${owner}/${repo}`;
  await redis.lpush(key, entry);
  await redis.ltrim(key, 0, 499);
}

export async function getActionLogs(
  owner: string,
  repo: string,
  limit = 50
): Promise<ActionLog[]> {
  const redis = getRedis();
  const key = `${LOG_PREFIX}${owner}/${repo}`;
  const logs = await redis.lrange<ActionLog>(key, 0, limit - 1);
  return logs;
}

// --- Per-User Password ---

export async function getUserPasswordHash(username: string): Promise<string | null> {
  const redis = getRedis();
  return redis.get<string>(`user:password:${username.toLowerCase()}`);
}

export async function setUserPasswordHash(username: string, hash: string): Promise<void> {
  const redis = getRedis();
  await redis.set(`user:password:${username.toLowerCase()}`, hash);
}

export async function isAnyUserPasswordSet(): Promise<boolean> {
  const redis = getRedis();
  const admins = await redis.smembers("admin:users");
  for (const admin of admins) {
    const hash = await redis.get(`user:password:${admin}`);
    if (hash) return true;
  }
  return false;
}
