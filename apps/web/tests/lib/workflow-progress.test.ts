import { describe, expect, it } from "vitest";
import type { AuditEvent } from "@/types/audit";
import { WORKFLOW_STEP_COUNT, buildWorkflowProgress, normalizeWorkflowStep } from "@/lib/workflow-progress";
import { createMockCase } from "../fixtures/case";

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: "evt-1",
    timestamp: "2026-06-01T10:00:00.000Z",
    caseId: "case-1",
    caseSubject: "Acme",
    caseOrderId: "ORD-1",
    step: 1,
    type: "API Call",
    description: "step",
    triggeredBy: "system",
    status: "Success",
    ...overrides,
  };
}

describe("workflow-progress", () => {
  describe("WORKFLOW_STEP_COUNT", () => {
    it("is a positive integer", () => {
      expect(WORKFLOW_STEP_COUNT).toBeGreaterThan(0);
    });
  });

  describe("normalizeWorkflowStep", () => {
    it("returns null for null/undefined/0/negative", () => {
      expect(normalizeWorkflowStep(null)).toBeNull();
      expect(normalizeWorkflowStep(undefined)).toBeNull();
      expect(normalizeWorkflowStep(0)).toBeNull();
      expect(normalizeWorkflowStep(-1)).toBeNull();
    });

    it("returns null for 'Researcher Action' events", () => {
      expect(normalizeWorkflowStep(3, "Researcher Action")).toBeNull();
    });

    it("returns step 14 for legacy step 16 (capped at WORKFLOW_STEP_COUNT)", () => {
      // s=16: s>15 -> s = legacy16[16] = 15
      // s=15: s>13 -> s=14
      // min(14, 14) = 14
      expect(normalizeWorkflowStep(16)).toBe(14);
    });

    it("clamps to step 14 for any number above 15", () => {
      expect(normalizeWorkflowStep(17)).toBe(14);
      expect(normalizeWorkflowStep(50)).toBe(14);
      expect(normalizeWorkflowStep(100)).toBe(14);
    });

    it("decrements steps 14 and 15 by 1", () => {
      // s=14: s>15 no, s>13 yes, s=13, min(13, 14)=13
      expect(normalizeWorkflowStep(14)).toBe(13);
      // s=15: s>15 no, s>13 yes, s=14, min(14, 14)=14
      expect(normalizeWorkflowStep(15)).toBe(14);
    });

    it("returns the step as-is for 1-13", () => {
      expect(normalizeWorkflowStep(1)).toBe(1);
      expect(normalizeWorkflowStep(7)).toBe(7);
      expect(normalizeWorkflowStep(13)).toBe(13);
    });
  });

  describe("buildWorkflowProgress", () => {
    it("returns currentStep=1 and no completed steps when caseRecord is undefined and no events", () => {
      const out = buildWorkflowProgress(undefined, []);
      expect(out.currentStep).toBe(1);
      expect(out.completedAt).toHaveLength(WORKFLOW_STEP_COUNT);
      expect(out.completedAt.every((v) => v === null)).toBe(true);
    });

    it("merges stepTimestamps from caseRecord", () => {
      const c = createMockCase({
        stepTimestamps: {
          1: "2026-06-01T10:00:00.000Z",
          3: "2026-06-01T12:00:00.000Z",
        },
      });
      const out = buildWorkflowProgress(c, []);
      expect(out.completedAt[0]).toBeTruthy();
      expect(out.completedAt[2]).toBeTruthy();
      expect(out.completedAt[1]).toBeNull();
    });

    it("ignores non-Success events", () => {
      const c = createMockCase();
      const events = [makeEvent({ step: 1, status: "Failed" })];
      const out = buildWorkflowProgress(c, events);
      expect(out.completedAt[0]).toBeNull();
    });

    it("uses the largest step completed to compute currentStep", () => {
      const c = createMockCase();
      const events = [
        makeEvent({ id: "1", step: 1, timestamp: "2026-06-01T08:00:00.000Z" }),
        makeEvent({ id: "2", step: 4, timestamp: "2026-06-01T10:00:00.000Z" }),
      ];
      const out = buildWorkflowProgress(c, events);
      // step 4 normalized: 4 <= 13, returns 4, currentStep = 4 + 1 = 5
      expect(out.currentStep).toBe(5);
    });

    it("uses Math.max(derivedCurrent, caseStep) and clamps to WORKFLOW_STEP_COUNT + 1", () => {
      const c = createMockCase({ currentStep: 7 });
      const events = [makeEvent({ id: "1", step: 2 })];
      const out = buildWorkflowProgress(c, events);
      // derivedCurrent = 2 + 1 = 3, caseStep = 7 -> max(3, 7) = 7
      expect(out.currentStep).toBe(7);
    });

    it("uses the earliest timestamp when the same step appears multiple times", () => {
      const c = createMockCase();
      const events = [
        makeEvent({ id: "a", step: 1, timestamp: "2026-06-15T12:00:00.000Z" }),
        makeEvent({ id: "b", step: 1, timestamp: "2026-06-01T12:00:00.000Z" }),
      ];
      const out = buildWorkflowProgress(c, events);
      // Earlier date wins — June 1 not June 15
      expect(out.completedAt[0]).toContain("Jun 2026");
      expect(out.completedAt[0]).toContain("01");
      expect(out.completedAt[0]).not.toContain("15");
    });

    it("keeps the earlier timestamp when a later one arrives", () => {
      const c = createMockCase({
        stepTimestamps: { 1: "2026-06-01T08:00:00.000Z" },
      });
      const events = [
        makeEvent({ id: "a", step: 1, timestamp: "2026-06-15T12:00:00.000Z" }),
      ];
      const out = buildWorkflowProgress(c, events);
      // The earlier stepTimestamps value should win
      expect(out.completedAt[0]).toContain("01");
      expect(out.completedAt[0]).not.toContain("15");
    });

    it("uses the later stepTimestamps when it is earlier than the event timestamp", () => {
      const c = createMockCase({
        stepTimestamps: { 1: "2026-06-10T08:00:00.000Z" },
      });
      const events = [
        makeEvent({ id: "a", step: 1, timestamp: "2026-06-01T12:00:00.000Z" }),
      ];
      const out = buildWorkflowProgress(c, events);
      // The event timestamp (June 1) is earlier, so it should win
      expect(out.completedAt[0]).toContain("01");
    });

    it("returns null entries for steps without timestamps", () => {
      const c = createMockCase();
      const events = [makeEvent({ id: "a", step: 2 })];
      const out = buildWorkflowProgress(c, events);
      expect(out.completedAt[0]).toBeNull();
      expect(out.completedAt[1]).toBeTruthy();
    });

    it("normalizes legacy step numbers in stepTimestamps and merges with event timestamps", () => {
      const c = createMockCase({
        stepTimestamps: {
          16: "2026-06-01T10:00:00.000Z", // legacy 16 -> step 14
        },
      });
      const out = buildWorkflowProgress(c, []);
      // stepTimestamps map ends with key 14 -> completedAt[13] is set
      expect(out.completedAt[13]).toBeTruthy();
      // derivedCurrent = 14 + 1 = 15
      expect(out.currentStep).toBe(15);
    });

    it("skips invalid step keys in caseRecord.stepTimestamps", () => {
      const c = createMockCase({
        stepTimestamps: {
          "0": "2026-06-01T10:00:00.000Z",
          "abc": "2026-06-01T10:00:00.000Z",
        } as Record<number, string>,
      });
      const out = buildWorkflowProgress(c, []);
      // No valid step — completedAt all null
      expect(out.completedAt.every((v) => v === null)).toBe(true);
    });

    it("skips events whose step normalizes to null", () => {
      const c = createMockCase();
      const events = [
        makeEvent({ id: "a", step: 0 }),
        makeEvent({ id: "b", step: -1 }),
      ];
      const out = buildWorkflowProgress(c, events);
      expect(out.completedAt.every((v) => v === null)).toBe(true);
    });

    it("falls back to caseStep=1 when currentStep is missing or invalid", () => {
      const c = createMockCase();
      const out = buildWorkflowProgress(c, []);
      // caseStep = normalizeWorkflowStep(1) ?? 1 = 1
      // derivedCurrent = 1, currentStep = max(1, 1) = 1
      expect(out.currentStep).toBe(1);
    });
  });
});
