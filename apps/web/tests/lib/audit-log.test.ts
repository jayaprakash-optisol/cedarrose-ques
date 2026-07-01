import { describe, expect, it } from "vitest";
import type { AuditEvent } from "@/types/audit";
import {
  groupAuditEventsByCase,
  indexAuditEventsByCase,
  resolveAuditCaseLabels,
  stepTimestampsFromEvents,
} from "@/lib/audit-log";
import { createMockCase } from "../fixtures/case";

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: "evt-1",
    timestamp: "2026-06-01T10:00:00.000Z",
    caseId: "case-1",
    caseSubject: "Acme Trading",
    caseOrderId: "ORD-1001",
    step: 1,
    type: "API Call",
    description: "Order created",
    triggeredBy: "system",
    status: "Success",
    ...overrides,
  };
}

describe("audit-log", () => {
  describe("groupAuditEventsByCase", () => {
    it("returns an empty array for empty input", () => {
      expect(groupAuditEventsByCase([])).toEqual([]);
    });

    it("keeps only the latest event per case", () => {
      const events: AuditEvent[] = [
        makeEvent({ id: "a", caseId: "c1", timestamp: "2026-06-01T10:00:00.000Z" }),
        makeEvent({ id: "b", caseId: "c1", timestamp: "2026-06-01T11:00:00.000Z" }),
        makeEvent({ id: "c", caseId: "c1", timestamp: "2026-06-01T09:00:00.000Z" }),
      ];
      const result = groupAuditEventsByCase(events);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("b");
    });

    it("sorts results by most recent timestamp first", () => {
      const events: AuditEvent[] = [
        makeEvent({ id: "a", caseId: "c1", timestamp: "2026-06-01T10:00:00.000Z" }),
        makeEvent({ id: "b", caseId: "c2", timestamp: "2026-06-02T10:00:00.000Z" }),
        makeEvent({ id: "c", caseId: "c3", timestamp: "2026-06-03T10:00:00.000Z" }),
      ];
      const ids = groupAuditEventsByCase(events).map((e) => e.id);
      expect(ids).toEqual(["c", "b", "a"]);
    });

    it("uses 'orphan:eventId' when caseId is missing", () => {
      const events: AuditEvent[] = [
        makeEvent({ id: "x", caseId: "", timestamp: "2026-06-01T10:00:00.000Z" }),
        makeEvent({ id: "y", caseId: "", timestamp: "2026-06-01T11:00:00.000Z" }),
      ];
      const result = groupAuditEventsByCase(events);
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.id).sort()).toEqual(["x", "y"]);
    });
  });

  describe("indexAuditEventsByCase", () => {
    it("returns an empty map for empty input", () => {
      const m = indexAuditEventsByCase([]);
      expect(m.size).toBe(0);
    });

    it("groups events by caseId in insertion order", () => {
      const events: AuditEvent[] = [
        makeEvent({ id: "a", caseId: "c1" }),
        makeEvent({ id: "b", caseId: "c2" }),
        makeEvent({ id: "c", caseId: "c1" }),
      ];
      const m = indexAuditEventsByCase(events);
      expect(m.get("c1")?.map((e) => e.id)).toEqual(["a", "c"]);
      expect(m.get("c2")?.map((e) => e.id)).toEqual(["b"]);
    });

    it("uses 'orphan:eventId' key when caseId is missing", () => {
      const events: AuditEvent[] = [
        makeEvent({ id: "x", caseId: "" }),
      ];
      const m = indexAuditEventsByCase(events);
      expect(m.get("orphan:x")?.map((e) => e.id)).toEqual(["x"]);
    });
  });

  describe("stepTimestampsFromEvents", () => {
    it("returns an empty object for empty input", () => {
      expect(stepTimestampsFromEvents([])).toEqual({});
    });

    it("skips events without a step or non-Success status", () => {
      const events: AuditEvent[] = [
        makeEvent({ id: "a", step: 0, status: "Success" }),
        makeEvent({ id: "b", step: 2, status: "Failed" }),
        makeEvent({ id: "c", step: 3, status: "Pending" }),
        makeEvent({ id: "d", step: 4, status: "Success" }),
      ];
      const out = stepTimestampsFromEvents(events);
      expect(Object.keys(out)).toEqual(["4"]);
    });

    it("skips events whose step normalizes to null", () => {
      const events: AuditEvent[] = [
        makeEvent({ id: "a", step: 1, type: "Researcher Action" }),
        makeEvent({ id: "b", step: 1, type: "API Call" }),
      ];
      const out = stepTimestampsFromEvents(events);
      expect(out["1"]).toBe("2026-06-01T10:00:00.000Z");
      expect(Object.keys(out)).toEqual(["1"]);
    });

    it("keeps the earliest timestamp per step", () => {
      const events: AuditEvent[] = [
        makeEvent({ id: "a", step: 5, timestamp: "2026-06-01T12:00:00.000Z" }),
        makeEvent({ id: "b", step: 5, timestamp: "2026-06-01T08:00:00.000Z" }),
        makeEvent({ id: "c", step: 5, timestamp: "2026-06-01T15:00:00.000Z" }),
      ];
      const out = stepTimestampsFromEvents(events);
      expect(out["5"]).toBe("2026-06-01T08:00:00.000Z");
    });
  });

  describe("resolveAuditCaseLabels", () => {
    it("returns caseCompanyName when caseRecord is provided and has companyData", () => {
      const c = createMockCase({ subjectName: "Ignored" });
      const ev = makeEvent();
      const out = resolveAuditCaseLabels(ev, c);
      expect(out.subject).toBe("Acme Trading LLC");
      expect(out.orderId).toBe("ORD-1001");
    });

    it("falls back to caseSubject when no caseRecord is provided", () => {
      const ev = makeEvent({ caseSubject: "From Event", caseOrderId: "ORD-EVT" });
      const out = resolveAuditCaseLabels(ev);
      expect(out.subject).toBe("From Event");
      expect(out.orderId).toBe("ORD-EVT");
    });

    it("falls back to caseRecord.subjectName when caseCompanyName is empty and caseSubject is missing", () => {
      const c = createMockCase({
        subjectName: "SubjectFromCase",
        orderId: "ORD-FROM-CASE",
        companyData: {
          ...createMockCase().companyData,
          companyName: "   ",
        },
      });
      const ev = makeEvent({ caseSubject: "", caseOrderId: "" });
      const out = resolveAuditCaseLabels(ev, c);
      expect(out.subject).toBe("SubjectFromCase");
      expect(out.orderId).toBe("ORD-FROM-CASE");
    });

    it("returns em-dash subject and empty orderId when nothing is available", () => {
      const ev = makeEvent({ caseSubject: "", caseOrderId: "" });
      const out = resolveAuditCaseLabels(ev);
      expect(out.subject).toBe("—");
      expect(out.orderId).toBe("");
    });
  });
});
