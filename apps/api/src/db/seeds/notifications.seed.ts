import { subHours, subDays } from "date-fns";
import type { DrizzleDB } from "../../config/database.js";
import { notifications } from "../schema/notifications.js";
import { SEED } from "./ids.js";

export async function seedNotifications(db: DrizzleDB) {
  const now = new Date();

  const rows = [
    {
      notificationId: SEED.notifications.submission,
      userId: SEED.users.analyst,
      type: "submission",
      title: "Case c-seed-003 submitted",
      body: "Gulf Supplies WLL completed the questionnaire.",
      read: false,
      caseId: SEED.cases.completed,
      createdAt: subDays(now, 1),
    },
    {
      notificationId: SEED.notifications.review,
      userId: SEED.users.researcher,
      type: "review",
      title: "Review required: c-seed-003",
      body: "A completed case is awaiting your review decision.",
      read: false,
      caseId: SEED.cases.completed,
      createdAt: subHours(now, 6),
    },
    {
      notificationId: SEED.notifications.expired,
      userId: SEED.users.analyst,
      type: "expired",
      title: "Case c-seed-005 expired",
      body: "The questionnaire link has expired after 3 reminders.",
      read: true,
      caseId: SEED.cases.expired,
      createdAt: subDays(now, 2),
    },
    {
      notificationId: SEED.notifications.stale,
      userId: SEED.users.analyst,
      type: "reminder",
      title: "Case c-seed-002 is stale",
      body: "No recipient activity in the last 72 hours.",
      read: false,
      caseId: SEED.cases.inProgress,
      createdAt: subHours(now, 2),
    },
  ];

  for (const row of rows) {
    await db.insert(notifications).values(row).onConflictDoNothing();
  }
}
