import { describe, it, expect } from "vitest";
import { WORKFLOW_STEP, WORKFLOW_STEP_COUNT } from "../../../src/config/workflow.js";

describe("workflow config", () => {
  it("defines 15 ordered workflow steps", () => {
    expect(WORKFLOW_STEP_COUNT).toBe(15);
    expect(WORKFLOW_STEP.ORDER_RECEIVED).toBe(1);
    expect(WORKFLOW_STEP.API_PUSH).toBe(15);
  });
});
