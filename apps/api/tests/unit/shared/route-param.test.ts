import { describe, it, expect } from "vitest";
import { routeParam } from "../../../src/shared/utils/route-param.js";

describe("routeParam", () => {
  it("returns string params as-is", () => {
    expect(routeParam("abc")).toBe("abc");
  });

  it("returns first element from array params", () => {
    expect(routeParam(["first", "second"])).toBe("first");
  });

  it("returns empty string when undefined", () => {
    expect(routeParam(undefined)).toBe("");
  });

  it("returns empty string for empty array params", () => {
    expect(routeParam([])).toBe("");
  });
});
