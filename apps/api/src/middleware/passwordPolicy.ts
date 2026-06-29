import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: false,
  DISALLOW_COMMON: true,
};

const COMMON_PASSWORDS = [
  "password", "qwerty", "123456", "admin", "welcome",
  "letmein", "abc123", "passw0rd", "pa$$word", "12345678",
  "password123", "admin123", "qwerty123",
];

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (env.nodeEnv === "development") return { valid: true };

  if (password.length < PASSWORD_POLICY.MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters long` };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter" };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    return { valid: false, message: "This password is too common and easy to guess" };
  }

  return { valid: true };
}

export function passwordPolicyMiddleware(req: Request, res: Response, next: NextFunction) {
  const password = (req.body.password ?? req.body.newPassword) as string | undefined;
  if (!password) return next();

  const result = validatePasswordStrength(password);
  if (!result.valid) {
    return res.status(400).json({ success: false, message: result.message });
  }
  next();
}
