import { describe, it, expect } from "vitest";
import { WORKFLOW_STEP, WORKFLOW_STEP_COUNT, normalizeWorkflowStep } from "../../../src/config/workflow.js";

describe("workflow config", () => {
  it("defines 14 ordered workflow steps", () => {
    expect(WORKFLOW_STEP_COUNT).toBe(14);
    expect(WORKFLOW_STEP.ORDER_RECEIVED).toBe(1);
    expect(WORKFLOW_STEP.API_PUSH).toBe(14);
    expect(WORKFLOW_STEP.DATA_MAPPING).toBe(13);
  });

  it("drops legacy researcher review audit steps", () => {
    expect(normalizeWorkflowStep(13, "Researcher Action")).toBeNull();
    expect(normalizeWorkflowStep(14)).toBe(13);
    expect(normalizeWorkflowStep(15)).toBe(14);
  });
});
