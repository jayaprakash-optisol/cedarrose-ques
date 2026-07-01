import { describe, it, expect } from "vitest";
import { parseDateQuery, parseOptionalString } from "../../../src/shared/utils/list-query.js";

describe("list-query utils", () => {
  it("parseOptionalString trims and rejects empty values", () => {
    expect(parseOptionalString("  hello ")).toBe("hello");
    expect(parseOptionalString("   ")).toBeUndefined();
    expect(parseOptionalString(undefined)).toBeUndefined();
  });

  it("parseDateQuery supports end-of-day", () => {
    const end = parseDateQuery("2026-01-15", true);
    expect(end?.getUTCHours()).toBe(23);
    expect(end?.getUTCMinutes()).toBe(59);
    expect(parseDateQuery("invalid")).toBeUndefined();
  });
});
