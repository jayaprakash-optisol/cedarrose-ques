import { describe, it, expect } from "vitest";
import { WORKFLOW_STEPS, COUNTRIES } from "@/config/workflow";

describe("workflow config", () => {
  it("exports workflow steps from mock data", () => {
    expect(WORKFLOW_STEPS.length).toBeGreaterThan(0);
    expect(typeof WORKFLOW_STEPS[0]).toBe("string");
  });

  it("exports country list", () => {
    expect(COUNTRIES.length).toBeGreaterThan(0);
    expect(COUNTRIES).toContain("United Kingdom");
  });
});
