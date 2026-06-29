import type { NotificationsRepository } from "./notifications.repository.js";

export class NotificationsService {
  constructor(private readonly notificationsRepo: NotificationsRepository) {}

  async list(userId: string, offset: number, limit: number) {
    return this.notificationsRepo.findByUser(userId, offset, limit);
  }

  async create(data: Parameters<NotificationsRepository["create"]>[0]) {
    return this.notificationsRepo.create(data);
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

  async sendReminder(caseRow: { caseId: string; caseRef: string; analystId: string | null }) {
    if (!caseRow.analystId) return;
    await this.create({
      userId: caseRow.analystId,
      type: "reminder",
      title: `Reminder for case ${caseRow.caseRef}`,
      body: "A questionnaire reminder was sent to the recipient",
      caseId: caseRow.caseId,
    });
  }
}
