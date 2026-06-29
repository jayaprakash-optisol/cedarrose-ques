import type { AuditEvent } from "@/types";
import auditData from "@/mocks/data/audit-log.json";
import { delay, normalizeMockDates } from "./utils";

export interface AuditService {
  list(): Promise<AuditEvent[]>;
}

export const mockAuditService: AuditService = {
  async list() {
    await delay();
    return normalizeMockDates(auditData as AuditEvent[], ["timestamp"]);
  },
};
