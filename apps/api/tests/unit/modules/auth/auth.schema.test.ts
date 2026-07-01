import { describe, it, expect } from "vitest";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  completeRegistrationSchema,
  updateMeSchema,
} from "../../../../src/modules/auth/auth.schema.js";

describe("auth schemas", () => {
  describe("loginSchema", () => {
    it("accepts valid login payload", () => {
      const result = loginSchema.parse({
        email: "user@cedarrose.com",
        password: "secret",
      });
      expect(result.rememberMe).toBe(false);
    });

    it("rejects invalid email", () => {
      expect(() => loginSchema.parse({ email: "not-email", password: "x" })).toThrow();
    });

    it("rejects empty password", () => {
      expect(() => loginSchema.parse({ email: "a@b.com", password: "" })).toThrow();
    });
  });

  describe("forgotPasswordSchema", () => {
    it("requires a valid email", () => {
      expect(forgotPasswordSchema.parse({ email: "a@b.com" }).email).toBe("a@b.com");
      expect(() => forgotPasswordSchema.parse({ email: "bad" })).toThrow();
    });
  });

  describe("resetPasswordSchema", () => {
    it("requires token and minimum password length", () => {
      expect(
        resetPasswordSchema.parse({ token: "abc", newPassword: "12345678" }),
      ).toEqual({ token: "abc", newPassword: "12345678" });
      expect(() => resetPasswordSchema.parse({ token: "", newPassword: "12345678" })).toThrow();
      expect(() => resetPasswordSchema.parse({ token: "abc", newPassword: "short" })).toThrow();
    });
  });

  describe("changePasswordSchema", () => {
    it("validates all password fields", () => {
      expect(() =>
        changePasswordSchema.parse({
          currentPassword: "",
          newPassword: "12345678",
          confirmPassword: "12345678",
        }),
      ).toThrow();
    });
  });

  describe("completeRegistrationSchema", () => {
    it("requires invitation token and password", () => {
      expect(
        completeRegistrationSchema.parse({ token: "invite", password: "12345678" }),
      ).toEqual({ token: "invite", password: "12345678" });
    });
  });

  describe("updateMeSchema", () => {
    it("rejects empty payload (at least one field required)", () => {
      const result = updateMeSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("accepts firstName update", () => {
      const result = updateMeSchema.safeParse({ firstName: "Jane" });
      expect(result.success).toBe(true);
    });

    it("accepts notification preference update", () => {
      const result = updateMeSchema.safeParse({ notifyOnSubmission: false });
      expect(result.success).toBe(true);
    });

    it("rejects firstName too long", () => {
      const result = updateMeSchema.safeParse({ firstName: "a".repeat(51) });
      expect(result.success).toBe(false);
    });
  });
});
