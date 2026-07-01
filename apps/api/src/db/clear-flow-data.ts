import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { isNotNull } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema/index.js";
import { auditEvents } from "./schema/audit-events.js";
import { cases } from "./schema/cases.js";
import { notifications } from "./schema/notifications.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

/**
 * Removes all cases, audit events, and case-linked data so the end-to-end
 * questionnaire flow can be tested from a clean slate.
 * Keeps users, companies, templates, and platform config intact.
 */
const pool = new Pool({ connectionString: env.databaseUrl });
const db = drizzle(pool, { schema, logger: false });

try {
  const counts = await db.transaction(async (tx) => {
    const removedAudit = await tx.delete(auditEvents).returning({ id: auditEvents.auditId });
    const removedNotifications = await tx
      .delete(notifications)
      .where(isNotNull(notifications.caseId))
      .returning({ id: notifications.notificationId });
    const removedCases = await tx.delete(cases).returning({ id: cases.caseId });

    return {
      audit: removedAudit.length,
      notifications: removedNotifications.length,
      cases: removedCases.length,
    };
  });

  logger.info(
    "Flow data cleared — %d cases, %d audit events, %d case notifications removed",
    counts.cases,
    counts.audit,
    counts.notifications,
  );
  logger.info("Users, companies, and templates were not modified.");
} catch (err) {
  logger.error({ err }, "Failed to clear flow data");
  process.exit(1);
} finally {
  await pool.end();
}
