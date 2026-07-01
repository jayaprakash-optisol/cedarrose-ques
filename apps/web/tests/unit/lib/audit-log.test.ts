import { describe, it, expect } from "vitest";
import {
  groupAuditEventsByCase,
  indexAuditEventsByCase,
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

  it("sorts groups across cases by latest timestamp descending", () => {
    const grouped = groupAuditEventsByCase([
      event({ id: "1", caseId: "cA", timestamp: "2026-01-01T08:00:00.000Z" }),
      event({ id: "2", caseId: "cB", timestamp: "2026-01-01T12:00:00.000Z" }),
      event({ id: "3", caseId: "cC", timestamp: "2026-01-01T10:00:00.000Z" }),
    ]);
    expect(grouped.map((e) => e.id)).toEqual(["2", "3", "1"]);
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

  it("assigns orphan key when caseId is missing in groupAuditEventsByCase", () => {
    const orphan = event({ caseId: undefined, id: "orphan-1" });
    const grouped = groupAuditEventsByCase([orphan]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].id).toBe("orphan-1");
  });

  it("indexes events by case including orphans", () => {
    const e1 = event({ id: "a", caseId: "c1" });
    const e2 = event({ id: "b", caseId: "c1" });
    const orphan = event({ id: "c", caseId: undefined });
    const map = indexAuditEventsByCase([e1, e2, orphan]);
    expect(map.get("c1")).toHaveLength(2);
    expect(map.get(`orphan:${orphan.id}`)).toHaveLength(1);
  });

  it("skips events with no step or non-Success status in stepTimestampsFromEvents", () => {
    const map = stepTimestampsFromEvents([
      event({ step: undefined, status: "Success" }),
      event({ step: 3, status: "Failed" }),
    ]);
    expect(Object.keys(map)).toHaveLength(0);
  });

  it("falls back to event caseSubject when no case record provided", () => {
    const labels = resolveAuditCaseLabels(event({ caseSubject: "Event Subject", caseOrderId: "ORD-X" }));
    expect(labels.subject).toBe("Event Subject");
    expect(labels.orderId).toBe("ORD-X");
  });

  it("falls back to caseRecord.subjectName when companyData has no name", () => {
    const labels = resolveAuditCaseLabels(event({ caseSubject: "", caseOrderId: "" }), {
      subjectName: "Fallback Name",
      orderId: "ORD-F",
      companyData: { companyName: "" } as never,
    });
    expect(labels.subject).toBe("Fallback Name");
    expect(labels.orderId).toBe("ORD-F");
  });

  it("keeps an earlier existing event in groupAuditEventsByCase", () => {
    const grouped = groupAuditEventsByCase([
      event({ id: "1", caseId: "c1", timestamp: "2026-01-02T10:00:00.000Z" }),
      event({ id: "2", caseId: "c1", timestamp: "2026-01-01T10:00:00.000Z" }),
    ]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].id).toBe("1");
  });

  it("returns em-dash subject when no name is available", () => {
    const labels = resolveAuditCaseLabels(event({ caseSubject: "", caseOrderId: "" }));
    expect(labels.subject).toBe("—");
    expect(labels.orderId).toBe("");
  });

  it("uses event orderId when caseRecord has no orderId", () => {
    const labels = resolveAuditCaseLabels(event({ caseSubject: "Subject", caseOrderId: "ORD-E" }));
    expect(labels.orderId).toBe("ORD-E");
  });

  it("falls back to caseRecord orderId when event has no orderId", () => {
    const labels = resolveAuditCaseLabels(event({ caseSubject: "X", caseOrderId: "" }), {
      subjectName: "S",
      orderId: "ORD-F",
      companyData: { companyName: "S" } as never,
    });
    expect(labels.orderId).toBe("ORD-F");
  });

  it("returns em-dash subject when caseCompanyName is empty and no fallbacks exist", () => {
    const labels = resolveAuditCaseLabels(event({ caseSubject: "", caseOrderId: "" }), {
      subjectName: "",
      orderId: "ORD-1",
      companyData: { companyName: " " } as never,
    });
    expect(labels.subject).toBe("—");
  });
});
