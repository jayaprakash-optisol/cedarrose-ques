import type { NotificationsRepository } from "./notifications.repository.js";
import type { CasesRepository } from "../cases/cases.repository.js";
import type {
  NotificationPreferenceKey,
  UserNotificationPreferencesRepository,
} from "../auth/user-notification-preferences.repository.js";
import {
  buildNotificationCopy,
  type CaseNotificationContext,
  type NotificationKind,
} from "./notification-copy.js";

const PREFERENCE_BY_TYPE: Partial<Record<NotificationKind, NotificationPreferenceKey>> = {
  submission: "notifyOnSubmission",
  expired: "notifyOnLinkExpiry",
  stale: "notifyOnLinkExpiry",
  blocked: "notifyOnBlockedDispatch",
  reminder: "notifyOnRemindersSent",
};

export class NotificationsService {
  constructor(
    private readonly notificationsRepo: NotificationsRepository,
    private readonly casesRepo: CasesRepository,
    private readonly notificationPreferencesRepo: UserNotificationPreferencesRepository,
  ) {}

  private async caseContext(caseId: string): Promise<CaseNotificationContext | null> {
    const c = await this.casesRepo.findById(caseId);
    if (!c) return null;
    return {
      caseRef: c.caseRef,
      orderId: c.orderId,
      subjectName: c.subjectName,
      status: c.status,
      completionMandatory: c.completionMandatory,
      remindersSent: c.remindersSent,
      company: c.company,
    };
  }

  private enrichRow(
    row: Awaited<ReturnType<NotificationsRepository["findByUser"]>>["data"][number],
    context: CaseNotificationContext | null,
  ) {
    if (!context) return row;
    const opts =
      row.type === "stale"
        ? { staleHours: 72 }
        : row.type === "reminder"
          ? { reminderNumber: Math.max(context.remindersSent ?? 0, 1) }
          : undefined;
    const copy = buildNotificationCopy(row.type as NotificationKind, context, opts);
    return { ...row, title: copy.title, body: copy.body };
  }

  async list(userId: string, offset: number, limit: number) {
    const { data, total } = await this.notificationsRepo.findByUser(userId, offset, limit);

    const caseIds = [...new Set(data.map((n) => n.caseId).filter((id): id is string => !!id))];
    const caseMap = new Map<string, CaseNotificationContext>();
    await Promise.all(
      caseIds.map(async (id) => {
        const ctx = await this.caseContext(id);
        if (ctx) caseMap.set(id, ctx);
      }),
    );

    const enriched = data.map((row) =>
      row.caseId ? this.enrichRow(row, caseMap.get(row.caseId) ?? null) : row,
    );

    return { data: enriched, total };
  }

  async create(data: Parameters<NotificationsRepository["create"]>[0]) {
    const prefKey = PREFERENCE_BY_TYPE[data.type as NotificationKind];
    if (prefKey && data.userId) {
      const preferences = await this.notificationPreferencesRepo.findByUserId(data.userId);
      if (preferences[prefKey] === false) return null;
    }

    if (data.caseId) {
      const context = await this.caseContext(data.caseId);
      if (context) {
        const opts =
          data.type === "stale"
            ? { staleHours: 72 }
            : data.type === "reminder"
              ? { reminderNumber: (context.remindersSent ?? 0) || 1 }
              : undefined;
        const copy = buildNotificationCopy(data.type as NotificationKind, context, opts);
        return this.notificationsRepo.create({
          ...data,
          title: copy.title,
          body: copy.body,
        });
      }
    }
    return this.notificationsRepo.create(data);
  }

  async notifySubmission(caseId: string, analystId: string) {
    await this.create({
      userId: analystId,
      type: "submission",
      title: "New submission received",
      body: "",
      caseId,
    });
  }

  async notifyReviewApproved(caseId: string, analystId: string, notes?: string) {
    const context = await this.caseContext(caseId);
    if (!context) return;
    const copy = buildNotificationCopy("review", context, { notes });
    await this.notificationsRepo.create({
      userId: analystId,
      type: "review",
      title: copy.title,
      body: copy.body,
      caseId,
    });
  }

  async notifyExpired(caseId: string, analystId: string) {
    await this.create({
      userId: analystId,
      type: "expired",
      title: "Questionnaire link expired",
      body: "",
      caseId,
    });
  }

  async notifyStale(caseId: string, analystId: string, staleHours: number) {
    const context = await this.caseContext(caseId);
    if (!context) return;
    const copy = buildNotificationCopy("stale", context, { staleHours });
    await this.notificationsRepo.create({
      userId: analystId,
      type: "stale",
      title: copy.title,
      body: copy.body,
      caseId,
    });
  }

  async sendReminder(caseRow: { caseId: string; analystId: string | null }) {
    if (!caseRow.analystId) return;
    const context = await this.caseContext(caseRow.caseId);
    if (!context) return;
    const reminderNumber = (context.remindersSent ?? 0) + 1;
    const copy = buildNotificationCopy("reminder", context, { reminderNumber });
    await this.notificationsRepo.create({
      userId: caseRow.analystId,
      type: "reminder",
      title: copy.title,
      body: copy.body,
      caseId: caseRow.caseId,
    });
  }

  async markRead(notificationId: string, userId: string) {
    await this.notificationsRepo.markRead(notificationId, userId);
  }

  async markAllRead(userId: string) {
    await this.notificationsRepo.markAllRead(userId);
  }

  async delete(notificationId: string, userId: string) {
    await this.notificationsRepo.delete(notificationId, userId);
  }
}
