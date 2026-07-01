import "dotenv/config";
import { readFileSync } from "node:fs";
import { z } from "zod";

function normalizeAzureEmailConnectionString(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("endpoint=")) return trimmed;
  if (trimmed.startsWith("https://")) return `endpoint=${trimmed}`;
  return trimmed;
}

function readKey(value: string, fallbackPathVar?: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    if (fallbackPathVar) {
      const path = process.env[fallbackPathVar];
      if (path) {
        try {
          return readFileSync(path.trim(), "utf-8");
        } catch {
          throw new Error(`Cannot read key file: ${path}`);
        }
      }
    }
    return "";
  }
  if (trimmed.startsWith("-----BEGIN")) return trimmed;
  if (trimmed.endsWith(".pem")) {
    try {
      return readFileSync(trimmed, "utf-8");
    } catch {
      throw new Error(`Cannot read key file: ${trimmed}`);
    }
  }
  const decoded = Buffer.from(trimmed, "base64").toString("utf-8");
  if (decoded.startsWith("-----BEGIN")) return decoded;
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

    JWT_ACCESS_PRIVATE_KEY: z.string().default(""),
    JWT_ACCESS_PRIVATE_KEY_PATH: z.string().optional(),
    JWT_ACCESS_PUBLIC_KEY: z.string().default(""),
    JWT_ACCESS_PUBLIC_KEY_PATH: z.string().optional(),
    JWT_QUESTIONNAIRE_PRIVATE_KEY: z.string().default(""),
    JWT_QUESTIONNAIRE_PRIVATE_KEY_PATH: z.string().optional(),
    JWT_QUESTIONNAIRE_PUBLIC_KEY: z.string().default(""),
    JWT_QUESTIONNAIRE_PUBLIC_KEY_PATH: z.string().optional(),

    JWT_ISSUER: z.string().default("cedarrose-api"),
    JWT_AUDIENCE: z.string().default("cedarrose-client"),
    JWT_ACCESS_TOKEN_EXPIRY: z.string().default("1d"),
    JWT_REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    JWT_QUESTIONNAIRE_TOKEN_EXPIRY: z.string().default("15m"),
    JWT_ALGORITHM: z.enum(["RS256", "RS384", "RS512"]).default("RS256"),

    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(10),

    FRONTEND_URL: z.string().default("http://localhost:5173"),
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
  console.error("Invalid environment variables:\n", z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

const data = parsed.data;

function loadAccessPrivateKey(): string {
  const key = readKey(data.JWT_ACCESS_PRIVATE_KEY, "JWT_ACCESS_PRIVATE_KEY_PATH");
  if (!key) throw new Error("JWT_ACCESS_PRIVATE_KEY is required (set env var or path)");
  return key;
}

function loadAccessPublicKey(): string {
  const key = readKey(data.JWT_ACCESS_PUBLIC_KEY, "JWT_ACCESS_PUBLIC_KEY_PATH");
  if (!key) throw new Error("JWT_ACCESS_PUBLIC_KEY is required (set env var or path)");
  return key;
}

function loadQuestionnairePrivateKey(): string {
  const key = readKey(data.JWT_QUESTIONNAIRE_PRIVATE_KEY, "JWT_QUESTIONNAIRE_PRIVATE_KEY_PATH");
  if (!key) throw new Error("JWT_QUESTIONNAIRE_PRIVATE_KEY is required (set env var or path)");
  return key;
}

function loadQuestionnairePublicKey(): string {
  const key = readKey(data.JWT_QUESTIONNAIRE_PUBLIC_KEY, "JWT_QUESTIONNAIRE_PUBLIC_KEY_PATH");
  if (!key) throw new Error("JWT_QUESTIONNAIRE_PUBLIC_KEY is required (set env var or path)");
  return key;
}

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
  jwtAccessPrivateKey: loadAccessPrivateKey(),
  jwtAccessPublicKey: loadAccessPublicKey(),
  jwtQuestionnairePrivateKey: loadQuestionnairePrivateKey(),
  jwtQuestionnairePublicKey: loadQuestionnairePublicKey(),
  jwtIssuer: data.JWT_ISSUER,
  jwtAudience: data.JWT_AUDIENCE,
  jwtAccessTokenExpiry: data.JWT_ACCESS_TOKEN_EXPIRY,
  jwtRefreshTokenDays: data.JWT_REFRESH_TOKEN_DAYS,
  jwtQuestionnaireTokenExpiry: data.JWT_QUESTIONNAIRE_TOKEN_EXPIRY,
  jwtAlgorithm: data.JWT_ALGORITHM,
  bcryptRounds: data.BCRYPT_ROUNDS,
  frontendUrl: data.FRONTEND_URL,
  allowedOrigins: data.ALLOWED_ORIGINS,
  allowedExternalHosts: data.ALLOWED_EXTERNAL_HOSTS,
  azureEmailConnectionString: data.AZURE_EMAIL_CONNECTION_STRING,
  azureEmailSender: data.AZURE_EMAIL_SENDER,
  logLevel: data.LOG_LEVEL,
  trustProxyHops: data.TRUST_PROXY_HOPS,
  isProduction: data.NODE_ENV === "production",
};
