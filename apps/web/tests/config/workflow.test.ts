import { describe, expect, it } from "vitest";
import { COUNTRIES, WORKFLOW_STEPS } from "@/config/workflow";

describe("config/workflow", () => {
  it("exposes WORKFLOW_STEPS as a non-empty array of strings", () => {
    expect(Array.isArray(WORKFLOW_STEPS)).toBe(true);
    expect(WORKFLOW_STEPS.length).toBeGreaterThan(0);
    expect(WORKFLOW_STEPS.every((s) => typeof s === "string")).toBe(true);
  });

  it("exposes COUNTRIES as a non-empty array of strings", () => {
    expect(Array.isArray(COUNTRIES)).toBe(true);
    expect(COUNTRIES.length).toBeGreaterThan(0);
    expect(COUNTRIES.every((s) => typeof s === "string")).toBe(true);
  });
});
