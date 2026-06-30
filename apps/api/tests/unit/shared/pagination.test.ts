import { describe, it, expect } from "vitest";
import { parsePagination, paginationMeta, sanitizeCsvCell } from "../../../src/shared/utils/pagination.js";

describe("pagination utils", () => {
  it("clamps page and limit", () => {
    expect(parsePagination({ page: 0, limit: 500 })).toEqual({ page: 1, limit: 100, offset: 0 });
    expect(parsePagination({ page: 3, limit: 10 })).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  it("builds pagination meta", () => {
    expect(paginationMeta(2, 10, 45)).toEqual({ page: 2, limit: 10, total: 45 });
  });

  it("prefixes dangerous CSV cells", () => {
    expect(sanitizeCsvCell("=1+1")).toBe("'=1+1");
    expect(sanitizeCsvCell("+cmd")).toBe("'+cmd");
    expect(sanitizeCsvCell("-value")).toBe("'-value");
    expect(sanitizeCsvCell("@import")).toBe("'@import");
    expect(sanitizeCsvCell("safe")).toBe("safe");
    expect(sanitizeCsvCell(null as unknown as string)).toBe("");
  });
});
