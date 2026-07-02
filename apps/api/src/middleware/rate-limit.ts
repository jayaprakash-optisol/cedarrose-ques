import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

const limiterDefaults = {
  standardHeaders: true,
  legacyHeaders: false,
} as const;

/** Login attempts — brute-force protection. */
export const authLoginLimit = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 10,
});

/** Token refresh — moderate cap. */
export const authRefreshLimit = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 20,
});

/** OTP request / verify on public questionnaire flow. */
export const questionnaireOtpLimit = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many OTP attempts. Try again later." },
});

/** Forgot / reset password. */
export const authPasswordResetLimit = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many password reset attempts. Try again later." },
});

/** Invitation registration completion. */
export const authRegistrationLimit = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many registration attempts. Try again later." },
});

/** Authenticated password change. */
export const authChangePasswordLimit = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many password change attempts. Try again later." },
});

/** Endpoints that trigger outbound email (invite, resend link, etc.). */
export const emailActionLimit = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many email requests. Try again later." },
});

/** Webhook ingest from external integration clients. */
export const webhookIngestLimit = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { success: false, message: "Too many webhook requests. Try again later." },
});

export function setSecureCookie(
  _req: Request,
  res: Response,
  token: string,
  name = "access_token",
  expiresIn = 24 * 60 * 60 * 1000
): void {
  res.cookie(name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: expiresIn,
    path: "/",
  });
}

export function clearSecureCookie(res: Response, name = "access_token"): void {
  res.clearCookie(name, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}

export function cookieTokenExtractor(req: Request, _res: Response, next: NextFunction): void {
  if (!req.headers.authorization && req.cookies?.access_token) {
    req.headers.authorization = `Bearer ${req.cookies.access_token}`;
  }
  next();
}
