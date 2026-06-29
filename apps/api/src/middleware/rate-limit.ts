import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLoginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRefreshLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const questionnaireAuthLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authPasswordResetLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many password reset attempts. Try again later." },
});

export const authRegistrationLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many registration attempts. Try again later." },
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
