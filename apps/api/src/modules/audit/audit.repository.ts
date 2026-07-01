import { eq, and, desc, count, gte, lte, or, ilike, sql, type SQL } from "drizzle-orm";
import type { DrizzleDB } from "../../config/database.js";
import { auditEvents } from "../../db/schema/audit-events.js";
import { cases } from "../../db/schema/cases.js";

export interface AuditFilters {
  caseId?: string;
  type?: string;
  status?: string;
  search?: string;
  from?: Date;
  to?: Date;
  offset: number;
  limit: number;
}

export type AuditRow = typeof auditEvents.$inferSelect;

export type AuditRowWithCaseStatus = AuditRow & { caseStatus: string | null };

const EXPORT_BATCH_SIZE = 500;

function buildAuditConditions(filters: Omit<AuditFilters, "offset" | "limit">): SQL[] {
  const conditions: SQL[] = [];
  if (filters.caseId) conditions.push(eq(auditEvents.caseId, filters.caseId));
  if (filters.type) conditions.push(eq(auditEvents.eventType, filters.type));
  if (filters.status) conditions.push(eq(auditEvents.status, filters.status));
  if (filters.from) conditions.push(gte(auditEvents.createdAt, filters.from));
  if (filters.to) conditions.push(lte(auditEvents.createdAt, filters.to));
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(ilike(auditEvents.caseSubject, term), ilike(auditEvents.caseOrderId, term))!
    );
  }
  return conditions;
}

function auditWhereClause(filters: Omit<AuditFilters, "offset" | "limit">) {
  const conditions = buildAuditConditions(filters);
  return conditions.length ? and(...conditions) : undefined;
}

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export class AuditRepository {
  constructor(private readonly db: DrizzleDB) {}

  async insert(data: typeof auditEvents.$inferInsert) {
    const [row] = await this.db.insert(auditEvents).values(data).returning();
    return row;
  }

  async findAll(filters: AuditFilters) {
    const where = auditWhereClause(filters);

    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(auditEvents)
        .where(where)
        .orderBy(desc(auditEvents.createdAt))
        .limit(filters.limit)
        .offset(filters.offset),
      this.db.select({ total: count() }).from(auditEvents).where(where),
    ]);

    return { data, total: Number(total) };
  }

  /** Latest event per case (orphan events keyed by audit id), ordered by most recent activity. */
  async findGroupedByCase(
    filters: AuditFilters
  ): Promise<{ data: AuditRowWithCaseStatus[]; total: number }> {
    const where = auditWhereClause(filters);
    const whereSql = where ? sql`WHERE ${where}` : sql``;

    const [dataResult, countResult] = await Promise.all([
      this.db.execute(sql`
        WITH ranked AS (
          SELECT
            ${auditEvents.auditId} AS audit_id,
            ${auditEvents.caseId} AS case_id,
            ${auditEvents.caseSubject} AS case_subject,
            ${auditEvents.caseOrderId} AS case_order_id,
            ${auditEvents.step} AS step,
            ${auditEvents.eventType} AS event_type,
            ${auditEvents.description} AS description,
            ${auditEvents.triggeredBy} AS triggered_by,
            ${auditEvents.triggeredByUserId} AS triggered_by_user_id,
            ${auditEvents.status} AS status,
            ${auditEvents.payload} AS payload,
            ${auditEvents.createdAt} AS created_at,
            ${cases.status} AS case_status,
            ROW_NUMBER() OVER (
              PARTITION BY COALESCE(${auditEvents.caseId}::text, ${auditEvents.auditId}::text)
              ORDER BY ${auditEvents.createdAt} DESC
            ) AS rn
          FROM ${auditEvents}
          LEFT JOIN ${cases} ON ${cases.caseId} = ${auditEvents.caseId}
          ${whereSql}
        )
        SELECT *
        FROM ranked
        WHERE rn = 1
        ORDER BY created_at DESC
        LIMIT ${filters.limit}
        OFFSET ${filters.offset}
      `),
      this.db.execute(sql`
        SELECT COUNT(*)::text AS total
        FROM (
          SELECT DISTINCT COALESCE(${auditEvents.caseId}::text, ${auditEvents.auditId}::text) AS group_key
          FROM ${auditEvents}
          ${whereSql}
        ) grouped
      `),
    ]);

    const rows = extractRows<{
      audit_id: string;
      case_id: string | null;
      case_subject: string | null;
      case_order_id: string | null;
      step: number | null;
      event_type: string;
      description: string;
      triggered_by: string | null;
      triggered_by_user_id: string | null;
      status: string;
      payload: unknown;
      created_at: Date | string;
      case_status: string | null;
    }>(dataResult);

    const countRows = extractRows<{ total: string }>(countResult);

    return {
      data: rows.map((row) => ({
        auditId: row.audit_id,
        caseId: row.case_id,
        caseSubject: row.case_subject,
        caseOrderId: row.case_order_id,
        step: row.step,
        eventType: row.event_type,
        description: row.description,
        triggeredBy: row.triggered_by,
        triggeredByUserId: row.triggered_by_user_id,
        status: row.status,
        payload: row.payload,
        createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
        caseStatus: row.case_status,
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async countGrouped(filters: Omit<AuditFilters, "offset" | "limit">): Promise<number> {
    const where = auditWhereClause(filters);
    const whereSql = where ? sql`WHERE ${where}` : sql``;
    const countResult = await this.db.execute(sql`
      SELECT COUNT(*)::text AS total
      FROM (
        SELECT DISTINCT COALESCE(${auditEvents.caseId}::text, ${auditEvents.auditId}::text) AS group_key
        FROM ${auditEvents}
        ${whereSql}
      ) grouped
    `);
    const countRows = extractRows<{ total: string }>(countResult);
    return Number(countRows[0]?.total ?? 0);
  }

  async *exportBatches(
    filters: Omit<AuditFilters, "offset" | "limit">
  ): AsyncGenerator<AuditRowWithCaseStatus[]> {
    let offset = 0;
    while (true) {
      const { data } = await this.findAll({ ...filters, offset, limit: EXPORT_BATCH_SIZE });
      if (!data.length) break;

      const caseIds = [...new Set(data.map((e) => e.caseId).filter((id): id is string => !!id))];
      const statusByCase = new Map<string, string>();
      if (caseIds.length) {
        const statusRows = await this.db
          .select({ caseId: cases.caseId, status: cases.status })
          .from(cases)
          .where(
            sql`${cases.caseId} IN (${sql.join(
              caseIds.map((id) => sql`${id}`),
              sql`, `
            )})`
          );
        for (const row of statusRows) {
          statusByCase.set(row.caseId, row.status);
        }
      }

      yield data.map((row) => ({
        ...row,
        caseStatus: row.caseId ? (statusByCase.get(row.caseId) ?? null) : null,
      }));

      if (data.length < EXPORT_BATCH_SIZE) break;
      offset += EXPORT_BATCH_SIZE;
    }
  }
}
