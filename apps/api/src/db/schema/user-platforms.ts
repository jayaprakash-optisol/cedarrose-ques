import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const userPlatforms = pgTable("user_platforms", {
  platformId: uuid("PlatformID").primaryKey().defaultRandom(),
  userId: uuid("UserID").notNull().references(() => users.userId, { onDelete: "cascade" }),
  platform: varchar("Platform", { length: 50 }).notNull(),
  role: varchar("Role", { length: 20 }).notNull(),
  createdAt: timestamp("CreatedAt").notNull().defaultNow(),
});
