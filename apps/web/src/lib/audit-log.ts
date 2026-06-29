import type { AuditEvent } from "@/types/audit";

/** One row per case — keeps the latest event for the summary row. */
export function groupAuditEventsByCase(events: AuditEvent[]): AuditEvent[] {
  const byCase = new Map<string, AuditEvent>();

  for (const event of events) {
    const key = event.caseId || `orphan:${event.id}`;
    const existing = byCase.get(key);
    if (!existing || new Date(event.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
      byCase.set(key, event);
    }
  }

  return Array.from(byCase.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export function indexAuditEventsByCase(events: AuditEvent[]): Map<string, AuditEvent[]> {
  const map = new Map<string, AuditEvent[]>();
  for (const event of events) {
    const key = event.caseId || `orphan:${event.id}`;
    const list = map.get(key) ?? [];
    list.push(event);
    map.set(key, list);
  }
  return map;
}

/** Earliest successful timestamp per workflow step. */
export function stepTimestampsFromEvents(events: AuditEvent[]): Record<number, string> {
  const result: Record<number, string> = {};
  for (const event of events) {
    if (!event.step || event.status !== "Success") continue;
    const existing = result[event.step];
    if (!existing || new Date(event.timestamp).getTime() < new Date(existing).getTime()) {
      result[event.step] = event.timestamp;
    }
  }
  return result;
}

export function resolveAuditCaseLabels(
  event: AuditEvent,
  caseRecord?: { subjectName: string; orderId: string },
): { subject: string; orderId: string } {
  return {
    subject: event.caseSubject || caseRecord?.subjectName || "—",
    orderId: event.caseOrderId || caseRecord?.orderId || "",
  };
}
