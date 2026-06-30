import { describe, it, expect } from "vitest";
import {
  groupAuditEventsByCase,
  stepTimestampsFromEvents,
  resolveAuditCaseLabels,
} from "@/lib/audit-log";
import type { AuditEvent } from "@/types/audit";

const event = (overrides: Partial<AuditEvent>): AuditEvent => ({
  id: "1",
  timestamp: "2026-01-01T10:00:00.000Z",
  caseId: "c1",
  caseSubject: "Acme",
  caseOrderId: "ORD-1",
  step: 1,
  type: "API Call",
  description: "d",
  triggeredBy: "System",
  status: "Success",
  ...overrides,
});

describe("audit-log utils", () => {
  it("groups events by case keeping latest timestamp", () => {
    const grouped = groupAuditEventsByCase([
      event({ id: "1", timestamp: "2026-01-01T09:00:00.000Z" }),
      event({ id: "2", timestamp: "2026-01-01T11:00:00.000Z" }),
    ]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].id).toBe("2");
  });

  it("extracts earliest successful step timestamps", () => {
    const map = stepTimestampsFromEvents([
      event({ step: 2, timestamp: "2026-01-02T10:00:00.000Z" }),
      event({ step: 2, timestamp: "2026-01-01T10:00:00.000Z" }),
    ]);
    expect(map[2]).toBe("2026-01-01T10:00:00.000Z");
  });

  it("resolves labels from case record when available", () => {
    const labels = resolveAuditCaseLabels(event({}), {
      subjectName: "Legacy",
      orderId: "ORD-9",
      companyData: { companyName: "Acme LLC" } as never,
    });
    expect(labels.subject).toBe("Acme LLC");
    expect(labels.orderId).toBe("ORD-1");
  });
});
