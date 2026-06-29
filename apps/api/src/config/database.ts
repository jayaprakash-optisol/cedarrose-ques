import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema/index.js";
import { env } from "./env.js";

export type DrizzleDB = NodePgDatabase<typeof schema>;
export type DrizzleTx = Parameters<Parameters<DrizzleDB["transaction"]>[0]>[0];
export type DbClient = DrizzleDB | DrizzleTx;

let _db: DrizzleDB | null = null;
let _pool: Pool | null = null;

export function getDb(): DrizzleDB {
  if (_db) return _db;

  _pool = new Pool({
    connectionString: env.databaseUrl,
    max: env.isProduction ? 20 : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: env.isProduction ? { rejectUnauthorized: true } : false,
  });

  _db = drizzle(_pool, {
    schema,
    logger: env.logLevel === "debug",
  });

  return _db;
}

export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}
