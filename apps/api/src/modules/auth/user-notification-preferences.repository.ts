import { eq } from "drizzle-orm";
import type { DrizzleDB } from "../../config/database.js";
import { userNotificationPreferences } from "../../db/schema/user-notification-preferences.js";

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  notifyOnSubmission: true,
  notifyOnLinkExpiry: true,
  notifyOnBlockedDispatch: true,
  notifyOnRemindersSent: true,
} as const;

export type NotificationPreferenceKey = keyof typeof DEFAULT_NOTIFICATION_PREFERENCES;

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export class UserNotificationPreferencesRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findByUserId(userId: string): Promise<NotificationPreferences> {
    const [row] = await this.db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
      .limit(1);

    if (!row) return { ...DEFAULT_NOTIFICATION_PREFERENCES };

    return {
      notifyOnSubmission: row.notifyOnSubmission,
      notifyOnLinkExpiry: row.notifyOnLinkExpiry,
      notifyOnBlockedDispatch: row.notifyOnBlockedDispatch,
      notifyOnRemindersSent: row.notifyOnRemindersSent,
    };
  }

  async upsert(
    userId: string,
    data: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const current = await this.findByUserId(userId);
    const next = { ...current, ...data };

    await this.db
      .insert(userNotificationPreferences)
      .values({
        userId,
        notifyOnSubmission: next.notifyOnSubmission,
        notifyOnLinkExpiry: next.notifyOnLinkExpiry,
        notifyOnBlockedDispatch: next.notifyOnBlockedDispatch,
        notifyOnRemindersSent: next.notifyOnRemindersSent,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userNotificationPreferences.userId,
        set: {
          notifyOnSubmission: next.notifyOnSubmission,
          notifyOnLinkExpiry: next.notifyOnLinkExpiry,
          notifyOnBlockedDispatch: next.notifyOnBlockedDispatch,
          notifyOnRemindersSent: next.notifyOnRemindersSent,
          updatedAt: new Date(),
        },
      });

    return next;
  }
}
