import * as bcrypt from "bcryptjs";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { env } from "../../config/env.js";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.bcryptRounds);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateSecureToken(bytes = 48): string {
  return randomBytes(bytes).toString("hex");
}

export function generateOtp(length = 6): string {
  const max = 10 ** length;
  return randomInt(0, max).toString().padStart(length, "0");
}
