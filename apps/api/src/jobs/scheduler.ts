import cron from "node-cron";
import { differenceInDays, subHours } from "date-fns";
import type { Container } from "../container.js";
import { logger } from "../config/logger.js";

function getReminderDue(config: {
  reminder1Day: number;
  reminder2Day: number;
  reminderFinalDay: number;
}, sent: number): number | null {
  if (sent === 0) return config.reminder1Day;
  if (sent === 1) return config.reminder2Day;
  if (sent === 2) return config.reminderFinalDay;
  return null;
}

export function startScheduler(container: Container) {
  const { casesRepo, configService, auditService, notificationsService } = container;

  cron.schedule("0 */6 * * *", async () => {
    try {
      const config = await configService.get();
      const cases = await casesRepo.findByStatuses(["SENT", "OPENED", "IN PROGRESS"]);
      const now = new Date();

      for (const c of cases) {
        const daysSince = differenceInDays(now, c.dateReceived);
        const due = getReminderDue(config, c.remindersSent ?? 0);
        if (due !== null && daysSince >= due && (c.remindersSent ?? 0) < 3) {
          await notificationsService.sendReminder({
            caseId: c.caseId,
            caseRef: c.caseRef,
            analystId: c.analystId,
          });
          await casesRepo.incrementRemindersSent(c.caseId);
          await auditService.log({
            caseId: c.caseId,
            step: 6,
            eventType: "Link Event",
            description: "Reminder sent",
            status: "Success",
          });
        }
      }
    } catch (err) {
      logger.error({ err }, "send-reminders job failed");
    }
  });

  cron.schedule("0 * * * *", async () => {
    try {
      const expired = await casesRepo.findExpiredActive();
      for (const c of expired) {
        await casesRepo.update(c.caseId, { status: "EXPIRED" });
        await auditService.log({
          caseId: c.caseId,
          step: 6,
          eventType: "Link Event",
          description: "Link expired",
          status: "Success",
        });
        if (c.analystId) {
          await notificationsService.create({
            userId: c.analystId,
            type: "expired",
            title: `Case ${c.caseRef} expired`,
            body: "The questionnaire link has expired",
            caseId: c.caseId,
          });
        }
      }
    } catch (err) {
      logger.error({ err }, "expire-links job failed");
    }
  });

  cron.schedule("0 */4 * * *", async () => {
    try {
      const config = await configService.get();
      const threshold = subHours(new Date(), config.staleHours);
      const stale = await casesRepo.findStaleInProgress(threshold);
      for (const c of stale) {
        if (c.analystId) {
          await notificationsService.create({
            userId: c.analystId,
            type: "reminder",
            title: `Case ${c.caseRef} is stale`,
            body: `No activity in ${config.staleHours}h`,
            caseId: c.caseId,
          });
        }
      }
    } catch (err) {
      logger.error({ err }, "stale-cases job failed");
    }
  });

  logger.debug("background jobs scheduled");
}
