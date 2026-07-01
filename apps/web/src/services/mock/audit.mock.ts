import type { AuditEvent, AuditListParams } from "@/types";
import type { PaginatedResult } from "@/types/pagination";
import auditData from "@/mocks/data/audit-log.json";
import casesData from "@/mocks/data/cases.json";
import type { CaseRecord } from "@/types/case";
import { delay, normalizeMockDates } from "./utils";
import {
  exportAuditCsv,
  filterAuditEvents,
  listAuditEvents,
  downloadMockCsv,
} from "./listing";

let auditCache: AuditEvent[] | null = null;
let casesCache: CaseRecord[] | null = null;

function getAuditEvents(): AuditEvent[] {
  if (!auditCache) {
    auditCache = normalizeMockDates(auditData as AuditEvent[], ["timestamp"]);
  }
  return structuredClone(auditCache);
}

function getCases(): CaseRecord[] {
  if (!casesCache) {
    casesCache = normalizeMockDates(casesData as CaseRecord[], [
      "requestedDate",
      "lastActivity",
      "reviewDate",
    ]);
  }
  return structuredClone(casesCache);
}

export interface AuditService {
  list(params?: AuditListParams): Promise<PaginatedResult<AuditEvent>>;
  exportCsv(params?: Omit<AuditListParams, "page" | "limit" | "grouped">): Promise<void>;
}

export const mockAuditService: AuditService = {
  async list(params = {}) {
    await delay();
    return listAuditEvents(getAuditEvents(), getCases(), params);
  },

  async exportCsv(params = {}) {
    await delay(200);
    const filtered = filterAuditEvents(getAuditEvents(), params, getCases());
    downloadMockCsv(exportAuditCsv(filtered, getCases()), "cedarrose-audit-log.csv");
  },
};
