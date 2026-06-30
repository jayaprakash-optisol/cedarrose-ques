import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import {
  setSecureCookie,
  clearSecureCookie,
  cookieTokenExtractor,
} from "../../../src/middleware/rate-limit.js";

describe("rate-limit cookie helpers", () => {
  it("setSecureCookie sets httpOnly cookie", () => {
    const res = { cookie: vi.fn() } as unknown as Response;
    setSecureCookie({} as Request, res, "token-123");
    expect(res.cookie).toHaveBeenCalledWith(
      "access_token",
      "token-123",
      expect.objectContaining({ httpOnly: true, path: "/" })
    );
  });

  it("clearSecureCookie clears access token", () => {
    const res = { clearCookie: vi.fn() } as unknown as Response;
    clearSecureCookie(res);
    expect(res.clearCookie).toHaveBeenCalledWith("access_token", expect.objectContaining({ path: "/" }));
  });

  it("cookieTokenExtractor promotes cookie to Authorization header", () => {
    const req = {
      headers: {},
      cookies: { access_token: "from-cookie" },
    } as unknown as Request;
    const next = vi.fn() as NextFunction;
    cookieTokenExtractor(req, {} as Response, next);
    expect(req.headers.authorization).toBe("Bearer from-cookie");
    expect(next).toHaveBeenCalled();
  });

  it("cookieTokenExtractor does not override existing Authorization", () => {
    const req = {
      headers: { authorization: "Bearer existing" },
      cookies: { access_token: "from-cookie" },
    } as unknown as Request;
    cookieTokenExtractor(req, {} as Response, vi.fn());
    expect(req.headers.authorization).toBe("Bearer existing");
  });
});
