import { Pool } from "pg";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function run() {
  const pool = new Pool({ connectionString: env.databaseUrl });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{ timestamp: string }>(
      "SELECT timestamp FROM migrations ORDER BY timestamp"
    );
    const applied = new Set(rows.map((r) => Number(r.timestamp)));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) continue;

      const ts = Number(match[1]);
      const name = `${match[2]}${match[1]}`;

      if (applied.has(ts)) {
        console.log(`  skip  [${ts}] ${name}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      console.log(`  run   [${ts}] ${name}`);
      await client.query(sql);
      await client.query("INSERT INTO migrations (timestamp, name) VALUES ($1, $2)", [ts, name]);
    }

    await client.query("COMMIT");
    console.log("Migrations complete");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
