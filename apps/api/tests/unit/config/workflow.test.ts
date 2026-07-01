import { describe, it, expect } from "vitest";
import { WORKFLOW_STEP, WORKFLOW_STEP_COUNT, normalizeWorkflowStep } from "../../../src/config/workflow.js";

describe("workflow config", () => {
  it("defines 14 ordered workflow steps", () => {
    expect(WORKFLOW_STEP_COUNT).toBe(14);
    expect(WORKFLOW_STEP.ORDER_RECEIVED).toBe(1);
    expect(WORKFLOW_STEP.API_PUSH).toBe(14);
    expect(WORKFLOW_STEP.DATA_MAPPING).toBe(13);
  });

  it("returns null for null/undefined/negative steps", () => {
    expect(normalizeWorkflowStep(null)).toBeNull();
    expect(normalizeWorkflowStep(undefined)).toBeNull();
    expect(normalizeWorkflowStep(0)).toBeNull();
    expect(normalizeWorkflowStep(-1)).toBeNull();
  });

  it("drops legacy researcher review audit steps", () => {
    expect(normalizeWorkflowStep(13, "Researcher Action")).toBeNull();
    expect(normalizeWorkflowStep(14)).toBe(13);
    expect(normalizeWorkflowStep(15)).toBe(14);
  });

  it("maps legacy 16-step workflow to current 14-step", () => {
    expect(normalizeWorkflowStep(16)).toBe(14);
    expect(normalizeWorkflowStep(17)).toBe(14);
    expect(normalizeWorkflowStep(18)).toBe(14);
    expect(normalizeWorkflowStep(20)).toBe(14);
  });

  it("handles old 15-step mapping for steps > 13", () => {
    expect(normalizeWorkflowStep(14)).toBe(13);
    expect(normalizeWorkflowStep(15)).toBe(14);
  });

  it("caps at WORKFLOW_STEP_COUNT", () => {
    expect(normalizeWorkflowStep(20)).toBe(14);
  });
});
