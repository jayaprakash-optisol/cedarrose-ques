import { eq, and, sql } from "drizzle-orm";
import type { DrizzleDB } from "../../config/database.js";
import { companyRequests } from "../../db/schema/company-requests.js";

export class CompanyRequestsRepository {
  constructor(private readonly db: DrizzleDB) {}

  async upsert(data: {
    orderId: string;
    externalRef: string;
    companyName: string;
    country: string;
    riskRating?: string;
    incorporationDate?: string;
    legalStructure?: string;
    primaryIndustry?: string;
    recipientType?: string;
    recipientEmails: string[];
    rawPayload: Record<string, unknown>;
  }) {
    const [row] = await this.db
      .insert(companyRequests)
      .values({
        ...data,
        status: "Pending",
        receivedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [companyRequests.orderId, companyRequests.externalRef],
        set: {
          companyName: data.companyName,
          country: data.country,
          riskRating: data.riskRating,
          incorporationDate: data.incorporationDate,
          legalStructure: data.legalStructure,
          primaryIndustry: data.primaryIndustry,
          recipientType: data.recipientType,
          recipientEmails: data.recipientEmails,
          rawPayload: data.rawPayload,
          status: "Pending",
          receivedAt: new Date(),
          consumedAt: sql`NULL`,
          caseId: sql`NULL`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  async findAll(status?: string) {
    const conditions = [];
    if (status) conditions.push(eq(companyRequests.status, status));
    const where = conditions.length ? and(...conditions) : undefined;

    return this.db
      .select()
      .from(companyRequests)
      .where(where)
      .orderBy(sql`${companyRequests.receivedAt} DESC`);
  }

  async findById(companyRequestId: string) {
    const [row] = await this.db
      .select()
      .from(companyRequests)
      .where(eq(companyRequests.companyRequestId, companyRequestId))
      .limit(1);
    return row ?? null;
  }

  async markConsumed(companyRequestId: string, caseId: string) {
    const [row] = await this.db
      .update(companyRequests)
      .set({
        status: "Used",
        consumedAt: new Date(),
        caseId,
        updatedAt: new Date(),
      })
      .where(eq(companyRequests.companyRequestId, companyRequestId))
      .returning();
    return row;
  }
}
