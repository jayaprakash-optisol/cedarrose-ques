import "dotenv/config";
import { eq } from "drizzle-orm";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { closeDb, getDb } from "./config/database.js";
import { users } from "./db/schema/users.js";
import { startScheduler } from "./jobs/scheduler.js";

async function verifyDatabaseReady(): Promise<void> {
  const db = getDb();
  await db.select().from(users).limit(1);

  const [admin] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.email, "admin@cedarrose.local"))
    .limit(1);

  if (!admin) {
    logger.warn(
      "Seed user admin@cedarrose.local not found — login will fail until you run: npm run migrate && npm run seed",
    );
  }
}

const { app, container } = createApp();

try {
  await verifyDatabaseReady();
} catch (err) {
  logger.error(
    { err },
    "Database not ready — run `npm run migrate` then `npm run seed` before using the API",
  );
  process.exit(1);
}

const server = app.listen(env.port, () => {
  const docsHint = env.isProduction ? "" : "  →  /api/docs";
  logger.info(`OpsHub API ready on :${env.port}${docsHint}`);
  startScheduler(container);
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => {
    await closeDb();
    process.exit(0);
  });
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
  process.exit(1);
});
