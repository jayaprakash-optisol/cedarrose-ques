import { pgTable, uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { cases } from "./cases.js";

export const notifications = pgTable("notifications", {
  notificationId: uuid("NotificationID").primaryKey().defaultRandom(),
  userId: uuid("UserID").references(() => users.userId, { onDelete: "cascade" }),
  type: varchar("Type", { length: 20 }).notNull(),
  title: varchar("Title", { length: 255 }).notNull(),
  body: text("Body").notNull(),
  read: boolean("Read").notNull().default(false),
  caseId: uuid("CaseID").references(() => cases.caseId),
  createdAt: timestamp("CreatedAt").notNull().defaultNow(),
});
