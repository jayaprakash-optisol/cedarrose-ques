import { Pool } from "pg";
import { env } from "../config/env.js";

async function status() {
  const pool = new Pool({ connectionString: env.databaseUrl });
  const { rows } = await pool.query("SELECT id, timestamp, name FROM migrations ORDER BY timestamp");
  console.table(rows);
  await pool.end();
}

status();
