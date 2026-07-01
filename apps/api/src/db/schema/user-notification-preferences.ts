import { pgTable, uuid, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const userNotificationPreferences = pgTable("user_notification_preferences", {
  userId: uuid("UserID")
    .primaryKey()
    .references(() => users.userId, { onDelete: "cascade" }),
  notifyOnSubmission: boolean("NotifyOnSubmission").notNull().default(true),
  notifyOnLinkExpiry: boolean("NotifyOnLinkExpiry").notNull().default(true),
  notifyOnBlockedDispatch: boolean("NotifyOnBlockedDispatch").notNull().default(true),
  notifyOnRemindersSent: boolean("NotifyOnRemindersSent").notNull().default(true),
  updatedAt: timestamp("UpdatedAt").notNull().defaultNow(),
});

export type UserNotificationPreferencesRow = typeof userNotificationPreferences.$inferSelect;
export type NewUserNotificationPreferencesRow = typeof userNotificationPreferences.$inferInsert;
