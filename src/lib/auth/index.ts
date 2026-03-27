import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getAdminPasswordHash, setAdminPasswordHash } from "@/lib/db/queries";

const JWT_SECRET = () => process.env.JWT_SECRET!;
const TOKEN_EXPIRY = "24h";

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

export function createToken(): string {
  return jwt.sign({ role: "admin" }, JWT_SECRET(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET());
    return true;
  } catch {
    return false;
  }
}
