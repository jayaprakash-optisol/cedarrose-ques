import { eq, and, count } from "drizzle-orm";
import type { DbClient, DrizzleDB } from "../../config/database.js";
import { users, type UserRow } from "../../db/schema/users.js";
import { userPlatforms } from "../../db/schema/companies.js";
import { userInvitations } from "../../db/schema/refresh-tokens.js";
import { normalizeEmail } from "../../shared/utils/email.js";

export class UsersRepository {
  constructor(private readonly db: DrizzleDB) {}

  private client(tx?: DbClient): DbClient {
    return tx ?? this.db;
  }

  async findAll(filters: { role?: string; offset: number; limit: number }) {
    const conditions = [];
    if (filters.role) conditions.push(eq(users.role, filters.role));
    const where = conditions.length ? and(...conditions) : undefined;

    const [data, [{ total }]] = await Promise.all([
      this.db.select().from(users).where(where).limit(filters.limit).offset(filters.offset),
      this.db.select({ total: count() }).from(users).where(where),
    ]);

    return { data, total: Number(total) };
  }

  async findById(userId: string) {
    const [row] = await this.db.select().from(users).where(eq(users.userId, userId)).limit(1);
    return row ?? null;
  }

  async findByEmail(email: string) {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, normalizeEmail(email)))
      .limit(1);
    return row ?? null;
  }

  async create(data: typeof users.$inferInsert, tx?: DbClient) {
    const db = this.client(tx);
    const [row] = await db.insert(users).values(data).returning();
    return row;
  }

  async update(userId: string, data: Partial<typeof users.$inferInsert>, tx?: DbClient) {
    const db = this.client(tx);
    const [row] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.userId, userId))
      .returning();
    return row;
  }

  async softDelete(userId: string) {
    return this.update(userId, { status: "Inactive" });
  }

  async setPlatforms(userId: string, platforms: { platform: string; role: string }[], tx?: DbClient) {
    const db = this.client(tx);
    await db.delete(userPlatforms).where(eq(userPlatforms.userId, userId));
    if (platforms.length) {
      await db.insert(userPlatforms).values(
        platforms.map((p) => ({ userId, platform: p.platform, role: p.role }))
      );
    }
  }

  async getPlatforms(userId: string) {
    return this.db.select().from(userPlatforms).where(eq(userPlatforms.userId, userId));
  }

  async getLatestInvitation(userId: string) {
    const [row] = await this.db
      .select()
      .from(userInvitations)
      .where(and(eq(userInvitations.userId, userId), eq(userInvitations.used, false)))
      .limit(1);
    return row ?? null;
  }

  async insertInvitation(data: typeof userInvitations.$inferInsert, tx?: DbClient) {
    const db = this.client(tx);
    await db.insert(userInvitations).values(data);
  }

  async cancelInvitations(userId: string, tx?: DbClient) {
    const db = this.client(tx);
    await db
      .update(userInvitations)
      .set({ used: true })
      .where(and(eq(userInvitations.userId, userId), eq(userInvitations.used, false)));
  }
}

export type { UserRow };
