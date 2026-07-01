import { Pool } from "pg";
import { env } from "../config/env.js";

const pool = new Pool({ connectionString: env.databaseUrl });
try {
  const { rows } = await pool.query("SELECT id, timestamp, name FROM migrations ORDER BY timestamp");
  console.table(rows);
} finally {
  await pool.end();
}
