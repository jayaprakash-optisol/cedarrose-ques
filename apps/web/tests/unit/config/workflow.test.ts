import { describe, it, expect } from "vitest";
import { WORKFLOW_STEPS, COUNTRIES } from "@/config/workflow";

describe("workflow config", () => {
  it("exports workflow steps", () => {
    expect(WORKFLOW_STEPS).toHaveLength(14);
    expect(typeof WORKFLOW_STEPS[0]).toBe("string");
    expect(WORKFLOW_STEPS).not.toContain("Researcher review");
  });

  it("exports country list", () => {
    expect(COUNTRIES.length).toBeGreaterThan(0);
    expect(COUNTRIES).toContain("United Kingdom");
  });
});
