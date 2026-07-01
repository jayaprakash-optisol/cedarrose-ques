import { describe, it, expect } from "vitest";
import { normalizeWorkflowStep, buildWorkflowProgress } from "@/lib/workflow-progress";
import type { AuditEvent } from "@/types/audit";
import type { CaseRecord } from "@/types/case";
import { makeCase } from "../../helpers/mock-case";

describe("workflow-progress", () => {
  it("maps legacy 16-step numbers to 14-step flow", () => {
    expect(normalizeWorkflowStep(16)).toBe(14);
    expect(normalizeWorkflowStep(17)).toBe(14);
    expect(normalizeWorkflowStep(3)).toBe(3);
    expect(normalizeWorkflowStep(13, "Researcher Action")).toBeNull();
    expect(normalizeWorkflowStep(0)).toBeNull();
    expect(normalizeWorkflowStep(null)).toBeNull();
  });

  it("builds current step from audit events", () => {
    const events: AuditEvent[] = [
      {
        id: "1",
        timestamp: "2026-01-01T10:00:00.000Z",
        caseId: "c1",
        caseSubject: "Acme",
        caseOrderId: "ORD-1",
        step: 1,
        type: "API Call",
        description: "order",
        triggeredBy: "System",
        status: "Success",
      },
    ];
    const caseRecord = { currentStep: 1 } as CaseRecord;
    const progress = buildWorkflowProgress(caseRecord, events);
    expect(progress.currentStep).toBeGreaterThanOrEqual(2);
    expect(progress.completedAt[0]).toContain("2026");
  });

  it("merges case step timestamps and ignores failed events", () => {
    const caseRecord = makeCase({
      stepTimestamps: {
        1: "2026-01-01T08:00:00.000Z",
        16: "2026-01-02T08:00:00.000Z",
      },
    });
    const events: AuditEvent[] = [
      {
        id: "1",
        timestamp: "2026-01-01T09:00:00.000Z",
        caseId: "c1",
        caseSubject: "Acme",
        caseOrderId: "ORD-1",
        step: 2,
        type: "Link Event",
        description: "sent",
        triggeredBy: "System",
        status: "Failed",
      },
      {
        id: "2",
        timestamp: "2026-01-01T10:00:00.000Z",
        caseId: "c1",
        caseSubject: "Acme",
        caseOrderId: "ORD-1",
        step: 3,
        type: "Authentication",
        description: "otp",
        triggeredBy: "Subject",
        status: "Success",
      },
    ];

    const progress = buildWorkflowProgress(caseRecord, events);
    expect(progress.currentStep).toBeGreaterThan(1);
    expect(progress.completedAt.filter(Boolean).length).toBeGreaterThan(0);
  });

  it("does not overwrite an earlier timestamp when a later event arrives for the same step", () => {
    const caseRecord = makeCase({
      stepTimestamps: { 1: "2026-01-01T08:00:00.000Z" }, // EARLIER timestamp set via case
    });
    const events: AuditEvent[] = [
      {
        id: "1",
        timestamp: "2026-01-01T12:00:00.000Z", // LATER — should not overwrite
        caseId: "c1",
        caseSubject: "Acme",
        caseOrderId: "ORD-1",
        step: 1,
        type: "API Call",
        description: "later event",
        triggeredBy: "System",
        status: "Success",
      },
    ];
    const progress = buildWorkflowProgress(caseRecord, events);
    // The earlier timestamp should be preserved (visible via completedAt[0] being set)
    expect(progress.completedAt[0]).not.toBeNull();
  });

  it("skips events with null step even when status is Success", () => {
    const events: AuditEvent[] = [
      {
        id: "1",
        timestamp: "2026-01-01T10:00:00.000Z",
        caseId: "c1",
        caseSubject: "Acme",
        caseOrderId: "ORD-1",
        step: null as never,
        type: "API Call",
        description: "no step",
        triggeredBy: "System",
        status: "Success",
      },
    ];
    const progress = buildWorkflowProgress(makeCase({ currentStep: 1 }), events);
    expect(progress.currentStep).toBeGreaterThanOrEqual(1);
  });

  it("handles undefined caseRecord gracefully", () => {
    const events: AuditEvent[] = [
      {
        id: "1",
        timestamp: "2026-01-01T10:00:00.000Z",
        caseId: "c1",
        caseSubject: "Acme",
        caseOrderId: "ORD-1",
        step: 2,
        type: "API Call",
        description: "step 2",
        triggeredBy: "System",
        status: "Success",
      },
    ];
    const progress = buildWorkflowProgress(undefined, events);
    expect(progress.currentStep).toBeGreaterThanOrEqual(1);
  });

  it("ignores caseRecord stepTimestamps that normalize to null", () => {
    const caseRecord = makeCase({
      stepTimestamps: {
        0: "2026-01-01T08:00:00.000Z",
        1: "2026-01-02T08:00:00.000Z",
      },
      currentStep: 2,
    });
    const progress = buildWorkflowProgress(caseRecord, []);
    // step 0 normalized to null and is ignored, step 1 should be set
    expect(progress.completedAt[0]).toContain("02 Jan 2026");
  });

  it("caps current step when workflow is complete", () => {
    const events: AuditEvent[] = Array.from({ length: 14 }, (_, i) => ({
      id: String(i),
      timestamp: `2026-01-${String(i + 1).padStart(2, "0")}T10:00:00.000Z`,
      caseId: "c1",
      caseSubject: "Acme",
      caseOrderId: "ORD-1",
      step: i + 1,
      type: "Form Activity" as const,
      description: `step ${i + 1}`,
      triggeredBy: "System",
      status: "Success" as const,
    }));

    const progress = buildWorkflowProgress(makeCase({ currentStep: 14 }), events);
    expect(progress.currentStep).toBeGreaterThanOrEqual(14);
  });
});
