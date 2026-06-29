import { eq, and, desc, count } from "drizzle-orm";
import type { DrizzleDB } from "../../config/database.js";
import { notifications } from "../../db/schema/notifications.js";

export class NotificationsRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findByUser(userId: string, offset: number, limit: number) {
    const where = eq(notifications.userId, userId);
    const [data, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(notifications).where(where),
    ]);
    return { data, total: Number(total) };
  }

  async create(data: typeof notifications.$inferInsert) {
    const [row] = await this.db.insert(notifications).values(data).returning();
    return row;
  }

  async markRead(notificationId: string, userId: string) {
    await this.db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.notificationId, notificationId), eq(notifications.userId, userId)));
  }

  async markAllRead(userId: string) {
    await this.db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }

  async delete(notificationId: string, userId: string) {
    await this.db
      .delete(notifications)
      .where(and(eq(notifications.notificationId, notificationId), eq(notifications.userId, userId)));
  }
}
