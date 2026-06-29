import { eq } from "drizzle-orm";
import type { DrizzleDB } from "../../config/database.js";
import { platformConfig } from "../../db/schema/platform-config.js";

export class ConfigRepository {
  constructor(private readonly db: DrizzleDB) {}

  async get() {
    const [row] = await this.db.select().from(platformConfig).limit(1);
    return row ?? null;
  }

  async replace(data: Partial<typeof platformConfig.$inferInsert>, updatedBy: string) {
    const existing = await this.get();
    if (!existing) {
      const [row] = await this.db
        .insert(platformConfig)
        .values({ ...data, updatedBy })
        .returning();
      return row;
    }

    const [row] = await this.db
      .update(platformConfig)
      .set({ ...data, updatedBy, updatedAt: new Date() })
      .where(eq(platformConfig.configId, existing.configId))
      .returning();
    return row;
  }
}
