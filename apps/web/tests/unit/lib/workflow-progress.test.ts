import { describe, it, expect } from "vitest";
import { normalizeWorkflowStep, buildWorkflowProgress } from "@/lib/workflow-progress";
import type { AuditEvent } from "@/types/audit";
import type { CaseRecord } from "@/types/case";
import { makeCase } from "../../helpers/mock-case";

describe("workflow-progress", () => {
  it("maps legacy 16-step numbers to 15-step flow", () => {
    expect(normalizeWorkflowStep(16)).toBe(15);
    expect(normalizeWorkflowStep(17)).toBe(15);
    expect(normalizeWorkflowStep(3)).toBe(3);
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

  it("caps current step when workflow is complete", () => {
    const events: AuditEvent[] = Array.from({ length: 15 }, (_, i) => ({
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

    const progress = buildWorkflowProgress(makeCase({ currentStep: 15 }), events);
    expect(progress.currentStep).toBeGreaterThanOrEqual(15);
  });
});
