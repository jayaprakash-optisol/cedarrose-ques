import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  hashToken,
  generateSecureToken,
  generateOtp,
} from "../../../src/shared/utils/crypto.js";

describe("crypto utils", () => {
  it("hashes and verifies passwords with bcrypt", async () => {
    const hash = await hashPassword("TestPass1");
    expect(hash).not.toBe("TestPass1");
    await expect(verifyPassword("TestPass1", hash)).resolves.toBe(true);
    await expect(verifyPassword("WrongPass1", hash)).resolves.toBe(false);
  });

  it("produces deterministic sha256 token hashes", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("def"));
  });

  it("generates unique secure tokens", () => {
    const a = generateSecureToken();
    const b = generateSecureToken();
    expect(a).not.toBe(b);
    expect(a).toHaveLength(96);
  });

  it("generates numeric OTP codes of requested length", () => {
    const otp = generateOtp(6);
    expect(otp).toMatch(/^\d{6}$/);
  });
});
