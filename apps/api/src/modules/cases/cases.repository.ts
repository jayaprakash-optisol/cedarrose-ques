import { eq, and, or, ilike, count, lt, inArray, sql, desc } from "drizzle-orm";
import { addHours } from "date-fns";
import type { DrizzleDB } from "../../config/database.js";
import { cases } from "../../db/schema/cases.js";
import { questionnaireResponses } from "../../db/schema/questionnaire-responses.js";
import { STATUS_PRIORITY } from "../../config/constants.js";
import { generateSecureToken, hashToken } from "../../shared/utils/crypto.js";

export interface CaseFilters {
  status?: string;
  recipientType?: string;
  country?: string;
  analystId?: string;
  search?: string;
  offset: number;
  limit: number;
}

export class CasesRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(caseId: string) {
    const [row] = await this.db.select().from(cases).where(eq(cases.caseId, caseId)).limit(1);
    return row ?? null;
  }

  async findAll(filters: CaseFilters) {
    const conditions = [];
    if (filters.status) conditions.push(eq(cases.status, filters.status));
    if (filters.recipientType) conditions.push(eq(cases.recipientType, filters.recipientType));
    if (filters.country) conditions.push(eq(cases.country, filters.country));
    if (filters.analystId) conditions.push(eq(cases.analystId, filters.analystId));
    if (filters.search) {
      conditions.push(
        or(
          ilike(cases.subjectName, `%${filters.search}%`),
          ilike(cases.orderId, `%${filters.search}%`)
        )!
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const priorityCases = Object.entries(STATUS_PRIORITY)
      .map(([status, priority]) => `WHEN '${status}' THEN ${priority}`)
      .join(" ");

    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(cases)
        .where(where)
        .orderBy(
          sql`CASE ${cases.status} ${sql.raw(priorityCases)} ELSE 99 END`,
          desc(cases.createdAt)
        )
        .limit(filters.limit)
        .offset(filters.offset),
      this.db.select({ total: count() }).from(cases).where(where),
    ]);

    return { data, total: Number(total) };
  }

  async getResponses(caseId: string) {
    return this.db
      .select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.caseId, caseId));
  }

  async getNextCaseRef() {
    const [{ count: caseCount }] = await this.db.select({ count: count() }).from(cases);
    return `c-${String(Number(caseCount) + 1).padStart(3, "0")}`;
  }

  async create(data: typeof cases.$inferInsert) {
    const [row] = await this.db.insert(cases).values(data).returning();
    return row;
  }

  async update(caseId: string, data: Partial<typeof cases.$inferInsert>) {
    const [row] = await this.db
      .update(cases)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cases.caseId, caseId))
      .returning();
    return row;
  }

  async findByLinkHash(tokenHash: string) {
    const [row] = await this.db
      .select()
      .from(cases)
      .where(and(eq(cases.linkTokenHash, tokenHash), sql`${cases.linkExpiry} > now()`))
      .limit(1);
    return row ?? null;
  }

  async findExpiredActive() {
    return this.db
      .select()
      .from(cases)
      .where(
        and(
          inArray(cases.status, ["SENT", "OPENED", "IN PROGRESS"]),
          lt(cases.linkExpiry, new Date())
        )
      );
  }

  async findByStatuses(statuses: string[]) {
    return this.db.select().from(cases).where(inArray(cases.status, statuses));
  }

  async findStaleInProgress(threshold: Date) {
    return this.db
      .select()
      .from(cases)
      .where(and(eq(cases.status, "IN PROGRESS"), lt(cases.lastActivity, threshold)));
  }

  async incrementRemindersSent(caseId: string) {
    const c = await this.findById(caseId);
    if (!c) return;
    await this.update(caseId, { remindersSent: (c.remindersSent ?? 0) + 1 });
  }
}

export function determineInitialStatus(hasEmail: boolean, hasUid: boolean): string {
  if (!hasUid && !hasEmail) return "PENDING LINKAGE & CONTACT";
  if (!hasEmail) return "PENDING CONTACT";
  return "NOT SENT";
}

export function generateSecureLink(validityHours: number) {
  const rawToken = generateSecureToken(48);
  const tokenHash = hashToken(rawToken);
  const expiresAt = addHours(new Date(), validityHours);
  return { rawToken, tokenHash, expiresAt };
}
