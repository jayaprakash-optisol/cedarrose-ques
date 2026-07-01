import { eq, and, or, ilike, count, lt, inArray, sql, desc, gte, lte } from "drizzle-orm";
import { addHours } from "date-fns";
import type { DrizzleDB } from "../../config/database.js";
import { cases } from "../../db/schema/cases.js";
import { users } from "../../db/schema/users.js";
import { companies, companyRecipientEmails } from "../../db/schema/companies.js";
import { questionnaireResponses } from "../../db/schema/questionnaire-responses.js";
import { auditEvents } from "../../db/schema/audit-events.js";
import { STATUS_PRIORITY } from "../../config/constants.js";
import { normalizeWorkflowStep } from "../../config/workflow.js";
import { generateSecureToken, hashToken } from "../../shared/utils/crypto.js";

export interface CaseFilters {
  status?: string;
  recipientType?: string;
  country?: string;
  analystId?: string;
  search?: string;
  from?: Date;
  to?: Date;
  offset: number;
  limit: number;
}

const EXPORT_BATCH_SIZE = 500;

type CaseRow = typeof cases.$inferSelect;
type CompanyRow = typeof companies.$inferSelect;

export type CaseCompanySnapshot = {
  companyName: string;
  crisNumber: string;
  country: string | null;
  riskRating: string | null;
  incorporationDate: string | null;
  legalStructure: string | null;
  primaryIndustry: string | null;
  recipientEmails: string[];
};

export type CaseWithAnalyst = CaseRow & {
  analystName: string | null;
  company: CaseCompanySnapshot | null;
  stepTimestamps?: Record<number, string>;
};

function withAnalystName(
  row: CaseRow,
  firstName: string | null,
  company: CaseCompanySnapshot | null,
  stepTimestamps?: Record<number, string>
): CaseWithAnalyst {
  return { ...row, analystName: firstName, company, stepTimestamps };
}

async function loadStepTimestamps(
  db: DrizzleDB,
  caseId: string
): Promise<Record<number, string>> {
  const events = await db
    .select({
      step: auditEvents.step,
      eventType: auditEvents.eventType,
      createdAt: auditEvents.createdAt,
    })
    .from(auditEvents)
    .where(and(eq(auditEvents.caseId, caseId), eq(auditEvents.status, "Success")))
    .orderBy(auditEvents.createdAt);

  const result: Record<number, string> = {};
  for (const ev of events) {
    const step = normalizeWorkflowStep(ev.step, ev.eventType);
    if (step !== null && !(step in result)) {
      result[step] = ev.createdAt.toISOString();
    }
  }
  return result;
}

function buildCompanySnapshot(
  company: CompanyRow | null,
  recipientEmails: string[]
): CaseCompanySnapshot | null {
  if (!company) return null;
  return {
    companyName: company.companyName,
    crisNumber: company.crisNumber,
    country: company.country,
    riskRating: company.riskRating,
    incorporationDate: company.incorporationDate ? String(company.incorporationDate) : null,
    legalStructure: company.legalStructure,
    primaryIndustry: company.primaryIndustry,
    recipientEmails,
  };
}

async function loadRecipientEmailsByCompanyIds(
  db: DrizzleDB,
  companyIds: string[]
): Promise<Map<string, string[]>> {
  if (!companyIds.length) return new Map();

  const rows = await db
    .select({
      companyId: companyRecipientEmails.companyId,
      email: companyRecipientEmails.email,
      isPrimary: companyRecipientEmails.isPrimary,
    })
    .from(companyRecipientEmails)
    .where(inArray(companyRecipientEmails.companyId, companyIds))
    .orderBy(desc(companyRecipientEmails.isPrimary));

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.companyId) ?? [];
    list.push(row.email);
    map.set(row.companyId, list);
  }
  return map;
}

export class CasesRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(caseId: string): Promise<CaseWithAnalyst | null> {
    const [row] = await this.db
      .select({ case: cases, analystFirstName: users.firstName, company: companies })
      .from(cases)
      .leftJoin(users, eq(cases.analystId, users.userId))
      .leftJoin(companies, eq(cases.companyId, companies.companyId))
      .where(eq(cases.caseId, caseId))
      .limit(1);
    if (!row) return null;

    const emailsByCompany = row.company
      ? await loadRecipientEmailsByCompanyIds(this.db, [row.company.companyId])
      : new Map<string, string[]>();
    const recipientEmails = row.company
      ? (emailsByCompany.get(row.company.companyId) ?? [])
      : [];

    const stepTimestamps = await loadStepTimestamps(this.db, caseId);

    return withAnalystName(
      row.case,
      row.analystFirstName,
      buildCompanySnapshot(row.company, recipientEmails),
      stepTimestamps
    );
  }

  private buildCaseConditions(filters: Omit<CaseFilters, "offset" | "limit">) {
    const conditions = [];
    if (filters.status) conditions.push(eq(cases.status, filters.status));
    if (filters.recipientType) conditions.push(eq(cases.recipientType, filters.recipientType));
    if (filters.country) conditions.push(eq(cases.country, filters.country));
    if (filters.analystId) conditions.push(eq(cases.analystId, filters.analystId));
    if (filters.from) conditions.push(gte(cases.dateReceived, filters.from));
    if (filters.to) conditions.push(lte(cases.dateReceived, filters.to));
    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(cases.subjectName, term),
          ilike(cases.orderId, term),
          ilike(companies.crisNumber, term)
        )!
      );
    }
    return conditions;
  }

  async findAll(filters: CaseFilters) {
    const conditions = this.buildCaseConditions(filters);
    const where = conditions.length ? and(...conditions) : undefined;

    const priorityCases = Object.entries(STATUS_PRIORITY)
      .map(([status, priority]) => `WHEN '${status}' THEN ${priority}`)
      .join(" ");

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({ case: cases, analystFirstName: users.firstName, company: companies })
        .from(cases)
        .leftJoin(users, eq(cases.analystId, users.userId))
        .leftJoin(companies, eq(cases.companyId, companies.companyId))
        .where(where)
        .orderBy(
          sql`CASE ${cases.status} ${sql.raw(priorityCases)} ELSE 99 END`,
          desc(cases.createdAt)
        )
        .limit(filters.limit)
        .offset(filters.offset),
      this.db.select({ total: count() }).from(cases).where(where),
    ]);

    const companyIds = [
      ...new Set(rows.map((row) => row.company?.companyId).filter((id): id is string => !!id)),
    ];
    const emailsByCompany = await loadRecipientEmailsByCompanyIds(this.db, companyIds);

    return {
      data: rows.map((row) => {
        const recipientEmails = row.company
          ? (emailsByCompany.get(row.company.companyId) ?? [])
          : [];
        return withAnalystName(
          row.case,
          row.analystFirstName,
          buildCompanySnapshot(row.company, recipientEmails)
        );
      }),
      total: Number(total),
    };
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

  async findByLinkTokenHash(tokenHash: string) {
    const [row] = await this.db
      .select()
      .from(cases)
      .where(eq(cases.linkTokenHash, tokenHash))
      .limit(1);
    return row ?? null;
  }

  async isLinkExpired(caseId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ expired: sql<boolean>`${cases.linkExpiry} IS NOT NULL AND ${cases.linkExpiry} <= now()` })
      .from(cases)
      .where(eq(cases.caseId, caseId))
      .limit(1);
    return row?.expired ?? false;
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

  async *exportBatches(
    filters: Omit<CaseFilters, "offset" | "limit">
  ): AsyncGenerator<CaseWithAnalyst[]> {
    let offset = 0;
    while (true) {
      const { data } = await this.findAll({ ...filters, offset, limit: EXPORT_BATCH_SIZE });
      if (!data.length) break;
      yield data;
      if (data.length < EXPORT_BATCH_SIZE) break;
      offset += EXPORT_BATCH_SIZE;
    }
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
