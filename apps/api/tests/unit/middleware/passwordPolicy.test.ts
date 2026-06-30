import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { validatePasswordStrength, passwordPolicyMiddleware } from "../../../src/middleware/passwordPolicy.js";

vi.mock("../../../src/config/env.js", () => ({
  env: { nodeEnv: "production" },
}));

describe("passwordPolicy", () => {
  describe("validatePasswordStrength", () => {
    it("rejects passwords shorter than 8 characters", () => {
      expect(validatePasswordStrength("Ab1")).toEqual({
        valid: false,
        message: "Password must be at least 8 characters long",
      });
    });

    it("requires uppercase, lowercase, and number", () => {
      expect(validatePasswordStrength("alllowercase1")).toMatchObject({ valid: false });
      expect(validatePasswordStrength("ALLUPPERCASE1")).toMatchObject({ valid: false });
      expect(validatePasswordStrength("NoNumbers")).toMatchObject({ valid: false });
    });

    it("rejects common passwords", () => {
      expect(validatePasswordStrength("Password123")).toMatchObject({ valid: false });
    });

    it("accepts strong passwords", () => {
      expect(validatePasswordStrength("Str0ngPass")).toEqual({ valid: true });
    });
  });

  describe("passwordPolicyMiddleware", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
      req = { body: {} };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      next = vi.fn();
    });

    it("skips when no password field is present", () => {
      passwordPolicyMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledOnce();
    });

    it("blocks weak newPassword values", () => {
      req.body = { newPassword: "weak" };
      passwordPolicyMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it("allows strong passwords", () => {
      req.body = { newPassword: "Str0ngPass" };
      passwordPolicyMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledOnce();
    });
  });
});
