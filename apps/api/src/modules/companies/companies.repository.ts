import { eq, count } from "drizzle-orm";
import type { DrizzleDB } from "../../config/database.js";
import { companies, companyRecipientEmails } from "../../db/schema/companies.js";

export class CompaniesRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findByCrisNumber(crisNumber: string) {
    const [row] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.crisNumber, crisNumber))
      .limit(1);
    return row ?? null;
  }

  async findById(companyId: string) {
    const [row] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.companyId, companyId))
      .limit(1);
    return row ?? null;
  }

  async findAll(offset: number, limit: number) {
    const [data, [{ total }]] = await Promise.all([
      this.db.select().from(companies).limit(limit).offset(offset),
      this.db.select({ total: count() }).from(companies),
    ]);
    return { data, total: Number(total) };
  }

  async create(data: typeof companies.$inferInsert) {
    const [row] = await this.db.insert(companies).values(data).returning();
    return row;
  }

  async update(companyId: string, data: Partial<typeof companies.$inferInsert>) {
    const [row] = await this.db
      .update(companies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companies.companyId, companyId))
      .returning();
    return row;
  }

  async getRecipientEmails(companyId: string) {
    return this.db
      .select()
      .from(companyRecipientEmails)
      .where(eq(companyRecipientEmails.companyId, companyId));
  }

  async addRecipientEmail(companyId: string, email: string, isPrimary = false) {
    const [row] = await this.db
      .insert(companyRecipientEmails)
      .values({ companyId, email, isPrimary })
      .returning();
    return row;
  }
}
