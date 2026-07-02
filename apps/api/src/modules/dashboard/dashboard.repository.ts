import { and, gte, isNotNull, inArray } from "drizzle-orm";
import type { DrizzleDB } from "../../config/database.js";
import { cases } from "../../db/schema/cases.js";

const DISPATCHED_STATUSES = [
  "SENT",
  "OPENED",
  "IN PROGRESS",
  "COMPLETED",
  "COMPLETED — MISSING DATA",
  "EXPIRED",
] as const;

export interface DashboardCaseRow {
  caseId: string;
  subjectName: string;
  status: string;
  dateDispatched: Date | null;
  firstOpenedAt: Date | null;
  dateSubmitted: Date | null;
  companyId: string | null;
  companyName: string | null;
}

export class DashboardRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findCasesForStats(since?: Date): Promise<DashboardCaseRow[]> {
    const conditions = [
      isNotNull(cases.dateDispatched),
      inArray(cases.status, [...DISPATCHED_STATUSES]),
    ];

    if (since) {
      conditions.push(gte(cases.dateDispatched, since));
    }

    return this.db
      .select({
        caseId: cases.caseId,
        subjectName: cases.subjectName,
        status: cases.status,
        dateDispatched: cases.dateDispatched,
        firstOpenedAt: cases.firstOpenedAt,
        dateSubmitted: cases.dateSubmitted,
        companyId: cases.companyRequestId,
        companyName: cases.subjectName,
      })
      .from(cases)
      .where(and(...conditions));
  }
}
