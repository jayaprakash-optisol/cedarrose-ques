import type { PaginatedResult } from "@/types/pagination";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import { groupAuditEventsByCase } from "@/lib/audit-log";
import type { AuditEvent } from "@/types/audit";
import type { CaseRecord } from "@/types/case";
import { caseCompanyName } from "@/lib/case-display";

export function paginate<T>(items: T[], page = 1, limit = DEFAULT_PAGE_SIZE): PaginatedResult<T> {
  const safeLimit = Math.max(1, limit);
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * safeLimit;
  const data = items.slice(offset, offset + safeLimit);
  return {
    data,
    meta: { page: safePage, limit: safeLimit, total: items.length },
  };
}

export function filterCases(items: CaseRecord[], params: {
  search?: string;
  status?: string;
  recipientType?: string;
  from?: string;
  to?: string;
}): CaseRecord[] {
  return items.filter((c) => {
    if (params.search) {
      const needle = params.search.toLowerCase();
      if (![caseCompanyName(c), c.orderId, c.uid].some((v) => v.toLowerCase().includes(needle))) {
        return false;
      }
    }
    if (params.status && params.status !== "All" && c.status !== params.status) return false;
    if (params.recipientType && params.recipientType !== "All" && c.recipientType !== params.recipientType) {
      return false;
    }
    const t = new Date(c.requestedDate).getTime();
    if (params.from && t < new Date(params.from).getTime()) return false;
    if (params.to && t > new Date(params.to).getTime() + 86_400_000) return false;
    return true;
  });
}

export function filterAuditEvents(items: AuditEvent[], params: {
  search?: string;
  caseId?: string;
  type?: string;
  from?: string;
  to?: string;
}, cases: CaseRecord[]): AuditEvent[] {
  return items.filter((e) => {
    if (params.caseId && e.caseId !== params.caseId) return false;
    if (params.search) {
      const caseRecord = cases.find((m) => m.id === e.caseId);
      const subject = caseRecord ? caseCompanyName(caseRecord) : e.caseSubject;
      const orderId = e.caseOrderId || caseRecord?.orderId || "";
      if (!`${subject} ${orderId}`.toLowerCase().includes(params.search.toLowerCase())) return false;
    }
    if (params.type && params.type !== "All" && e.type !== params.type) return false;
    const t = new Date(e.timestamp).getTime();
    if (params.from && t < new Date(params.from).getTime()) return false;
    if (params.to && t > new Date(params.to).getTime() + 86_400_000) return false;
    return true;
  });
}

export function listAuditEvents(
  allEvents: AuditEvent[],
  cases: CaseRecord[],
  params: {
    page?: number;
    limit?: number;
    search?: string;
    caseId?: string;
    type?: string;
    from?: string;
    to?: string;
    grouped?: boolean;
  },
): PaginatedResult<AuditEvent> {
  const filtered = filterAuditEvents(allEvents, params, cases);
  const rows =
    params.caseId || params.grouped === false
      ? filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      : groupAuditEventsByCase(filtered).map((event) => {
          const caseRecord = cases.find((c) => c.id === event.caseId);
          return {
            ...event,
            caseStatus: caseRecord?.status,
          };
        });
  return paginate(rows, params.page, params.limit);
}

export function exportCasesCsv(rows: CaseRecord[]): string {
  const header = ["Order ID", "Company name", "Country", "Recipient", "Status", "Mandatory", "Requested", "Last Activity", "Researcher"];
  const body = rows.map((c) => [
    c.orderId,
    caseCompanyName(c),
    c.country,
    c.recipientType,
    c.status,
    `${c.completionMandatory.done}/${c.completionMandatory.total}`,
    c.requestedDate,
    c.lastActivity,
    c.researcherStatus,
  ]);
  return [header, ...body]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function exportAuditCsv(rows: AuditEvent[], cases: CaseRecord[]): string {
  const grouped = groupAuditEventsByCase(rows);
  const header = "Timestamp,Case,Order,Step,Type,Description,TriggeredBy,Case status";
  const body = grouped.map((e) => {
    const caseRecord = cases.find((m) => m.id === e.caseId);
    const subject = caseRecord ? caseCompanyName(caseRecord) : e.caseSubject;
    const orderId = e.caseOrderId || caseRecord?.orderId || "";
    return [e.timestamp, subject, orderId, e.step, e.type, e.description, e.triggeredBy, caseRecord?.status ?? e.caseStatus ?? "—"]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [header, ...body].join("\n");
}

function downloadTextFile(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadMockCsv(csv: string, filename: string) {
  downloadTextFile(csv, filename);
}
