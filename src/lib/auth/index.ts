import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getAdminPasswordHash, setAdminPasswordHash } from "@/lib/db/queries";
import { getRedis } from "@/lib/db/redis";

const JWT_SECRET = () => process.env.JWT_SECRET!;
const TOKEN_EXPIRY = "24h";
const ADMIN_USERS_KEY = "admin:users";

// --- Password ---

export async function isPasswordSet(): Promise<boolean> {
  const hash = await getAdminPasswordHash();
  return hash !== null;
}

export async function setPassword(password: string): Promise<void> {
  const hash = await bcrypt.hash(password, 12);
  await setAdminPasswordHash(hash);
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = await getAdminPasswordHash();
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

// --- JWT ---

export function createToken(githubLogin: string): string {
  return jwt.sign(
    { role: "admin", github: githubLogin },
    JWT_SECRET(),
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token: string): { valid: boolean; github?: string } {
  try {
    const payload = jwt.verify(token, JWT_SECRET()) as { github?: string };
    return { valid: true, github: payload.github };
  } catch {
    return { valid: false };
  }
}

// --- Admin GitHub Users (whitelist) ---

export async function getAdminUsers(): Promise<string[]> {
  const redis = getRedis();
  return redis.smembers(ADMIN_USERS_KEY);
}

export async function addAdminUser(username: string): Promise<void> {
  const redis = getRedis();
  await redis.sadd(ADMIN_USERS_KEY, username.toLowerCase());
}

export async function removeAdminUser(username: string): Promise<void> {
  const redis = getRedis();
  await redis.srem(ADMIN_USERS_KEY, username.toLowerCase());
}

export async function isAdminUser(username: string): Promise<boolean> {
  const redis = getRedis();
  const result = await redis.sismember(ADMIN_USERS_KEY, username.toLowerCase());
  return result === 1;
}
