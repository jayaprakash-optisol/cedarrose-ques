import { eq, and, desc, count, gte, lte } from "drizzle-orm";
import type { DrizzleDB } from "../../config/database.js";
import { auditEvents } from "../../db/schema/audit-events.js";

export interface AuditFilters {
  caseId?: string;
  type?: string;
  status?: string;
  from?: Date;
  to?: Date;
  offset: number;
  limit: number;
}

export class AuditRepository {
  constructor(private readonly db: DrizzleDB) {}

  async insert(data: typeof auditEvents.$inferInsert) {
    const [row] = await this.db.insert(auditEvents).values(data).returning();
    return row;
  }

  async findAll(filters: AuditFilters) {
    const conditions = [];
    if (filters.caseId) conditions.push(eq(auditEvents.caseId, filters.caseId));
    if (filters.type) conditions.push(eq(auditEvents.eventType, filters.type));
    if (filters.status) conditions.push(eq(auditEvents.status, filters.status));
    if (filters.from) conditions.push(gte(auditEvents.createdAt, filters.from));
    if (filters.to) conditions.push(lte(auditEvents.createdAt, filters.to));

    const where = conditions.length ? and(...conditions) : undefined;

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

  async exportAll(filters: Omit<AuditFilters, "offset" | "limit">) {
    const { data } = await this.findAll({ ...filters, offset: 0, limit: 10000 });
    return data;
  }
}
