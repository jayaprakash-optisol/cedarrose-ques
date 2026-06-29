import "dotenv/config";
import { z } from "zod";

function normalizeAzureEmailConnectionString(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("endpoint=")) return trimmed;
  if (trimmed.startsWith("https://")) return `endpoint=${trimmed}`;
  return trimmed;
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(3000),

    PGHOST: z.string().default(""),
    PGUSER: z.string().default(""),
    PGPASSWORD: z.string().default(""),
    PGDATABASE: z.string().default(""),
    PGPORT: z.coerce.number().default(5432),
    DATABASE_URL: z.string().optional(),

    JWT_SECRET_KEY: z.string().min(32),
    QUESTIONNAIRE_JWT_SECRET: z.string().min(32),

    FRONTEND_URL: z.string().url().default("http://localhost:5173"),
    ALLOWED_ORIGINS: z
      .string()
      .default("http://localhost:5173")
      .transform((v) =>
        v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ALLOWED_EXTERNAL_HOSTS: z
      .string()
      .default("")
      .transform((v) =>
        v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),

    AZURE_EMAIL_CONNECTION_STRING: z.string().default("").transform(normalizeAzureEmailConnectionString),
    AZURE_EMAIL_SENDER: z.string().default(""),

    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== "production") return;

    const hasDbUrl = Boolean(data.DATABASE_URL?.trim());
    const hasPgCreds = Boolean(data.PGHOST && data.PGUSER && data.PGDATABASE);
    if (!hasDbUrl && !hasPgCreds) {
      ctx.addIssue({
        code: "custom",
        message: "DATABASE_URL or PGHOST/PGUSER/PGDATABASE is required in production",
        path: ["DATABASE_URL"],
      });
    }

    if (data.ALLOWED_ORIGINS.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "ALLOWED_ORIGINS must list at least one origin in production",
        path: ["ALLOWED_ORIGINS"],
      });
    }

    if (!data.AZURE_EMAIL_CONNECTION_STRING || !data.AZURE_EMAIL_SENDER) {
      ctx.addIssue({
        code: "custom",
        message: "Azure email connection string and sender are required in production",
        path: ["AZURE_EMAIL_CONNECTION_STRING"],
      });
    }
  });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:\n", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

export const env = {
  nodeEnv: data.NODE_ENV,
  port: data.PORT,
  pgHost: data.PGHOST,
  pgUser: data.PGUSER,
  pgPassword: data.PGPASSWORD,
  pgDatabase: data.PGDATABASE,
  pgPort: data.PGPORT,
  databaseUrl:
    data.DATABASE_URL ??
    `postgresql://${data.PGUSER}:${data.PGPASSWORD}@${data.PGHOST}:${data.PGPORT}/${data.PGDATABASE}`,
  jwtSecretKey: data.JWT_SECRET_KEY,
  questionnaireJwtSecret: data.QUESTIONNAIRE_JWT_SECRET,
  frontendUrl: data.FRONTEND_URL,
  allowedOrigins: data.ALLOWED_ORIGINS,
  allowedExternalHosts: data.ALLOWED_EXTERNAL_HOSTS,
  azureEmailConnectionString: data.AZURE_EMAIL_CONNECTION_STRING,
  azureEmailSender: data.AZURE_EMAIL_SENDER,
  logLevel: data.LOG_LEVEL,
  trustProxyHops: data.TRUST_PROXY_HOPS,
  isProduction: data.NODE_ENV === "production",
};
