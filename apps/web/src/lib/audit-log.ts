import type { AuditEvent } from "@/types/audit";
import type { CaseRecord } from "@/types/case";
import { caseCompanyName } from "@/lib/case-display";
import { normalizeWorkflowStep } from "@/lib/workflow-progress";

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

/** Earliest successful timestamp per workflow step (normalized to 15-step flow). */
export function stepTimestampsFromEvents(events: AuditEvent[]): Record<number, string> {
  const result: Record<number, string> = {};
  for (const event of events) {
    if (!event.step || event.status !== "Success") continue;
    const step = normalizeWorkflowStep(event.step);
    if (!step) continue;
    const existing = result[step];
    if (!existing || new Date(event.timestamp).getTime() < new Date(existing).getTime()) {
      result[step] = event.timestamp;
    }
  }
  return result;
}

export function resolveAuditCaseLabels(
  event: AuditEvent,
  caseRecord?: Pick<CaseRecord, "subjectName" | "orderId" | "companyData">,
): { subject: string; orderId: string } {
  return {
    subject:
      (caseRecord ? caseCompanyName(caseRecord) : null) ||
      event.caseSubject ||
      caseRecord?.subjectName ||
      "—",
    orderId: event.caseOrderId || caseRecord?.orderId || "",
  };
}
