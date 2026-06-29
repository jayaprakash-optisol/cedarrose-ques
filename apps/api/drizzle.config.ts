import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema/index.ts",
  out: "./src/db/drizzle-generated",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.PGHOST || "localhost",
    user: process.env.PGUSER || "localdev",
    password: process.env.PGPASSWORD || "admin123",
    database: process.env.PGDATABASE || "cedarrose_local",
    port: Number(process.env.PGPORT) || 5432,
    ssl: false,
  },
  verbose: true,
  strict: true,
} satisfies Config;
