import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schema/index.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { seedUsers } from "./users.seed.js";
import { seedCompanies } from "./companies.seed.js";
import { seedTemplates } from "./templates.seed.js";
import { seedCases } from "./cases.seed.js";
import { seedQuestionnaireResponses } from "./responses.seed.js";
import { seedAuditEvents } from "./audit.seed.js";
import { seedNotifications } from "./notifications.seed.js";
import { DEMO_LINK_TOKEN, SEED_ACCOUNTS, SEED_PASSWORD } from "./ids.js";

async function seed() {
  const pool = new Pool({ connectionString: env.databaseUrl });
  const db = drizzle(pool, { schema, logger: false });

  logger.info("Seeding OpsHub demo data…");

  await db.transaction(async (tx) => {
    await seedUsers(tx);
    await seedCompanies(tx);
    await seedTemplates(tx);
    await seedCases(tx);
    await seedQuestionnaireResponses(tx);
    await seedAuditEvents(tx);
    await seedNotifications(tx);
  });

  await pool.end();

  logger.info("Seed complete");
  logger.info("── Demo accounts (password: %s) ──", SEED_PASSWORD);
  for (const { email, role } of SEED_ACCOUNTS) {
    logger.info("  %s  (%s)", email, role);
  }
  logger.info("── Questionnaire demo link (case c-seed-001) ──");
  logger.info("  token: %s", DEMO_LINK_TOKEN);
  logger.info("  POST /api/v1/questionnaire/verify-link  { \"token\": \"...\" }");
}

seed().catch((err) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});
