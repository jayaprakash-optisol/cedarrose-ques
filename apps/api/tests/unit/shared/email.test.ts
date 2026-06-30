import { describe, it, expect } from "vitest";
import { normalizeEmail, detectEmailTypo } from "../../../src/shared/utils/email.js";

describe("email utils", () => {
  it("normalizes email casing and whitespace", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
    expect(normalizeEmail("")).toBe("");
  });

  it("detects common email typos", () => {
    expect(detectEmailTypo("user@example.con")).toBe(true);
    expect(detectEmailTypo("user@gmial.com")).toBe(true);
    expect(detectEmailTypo("user@example.com")).toBe(false);
  });
});
