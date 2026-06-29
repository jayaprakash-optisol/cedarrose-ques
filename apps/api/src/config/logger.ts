import pino from "pino";
import pinoPretty from "pino-pretty";
import { env } from "./env.js";

const isDev = env.nodeEnv === "development";

const prettyStream = isDev
  ? pinoPretty({
      colorize: true,
      translateTime: "HH:MM:ss",
      ignore: "pid,hostname,requestId,statusCode,durationMs",
      singleLine: true,
      messageFormat: "{msg}",
      sync: true,
    })
  : undefined;

export const logger = prettyStream
  ? pino({ level: env.logLevel }, prettyStream)
  : pino({ level: env.logLevel });

export function logDevError(context: string, err: unknown, extra?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error({ err, stack, ...extra }, context);
  if (isDev && stack) {
    console.error(`\n[${context}] ${message}\n${stack}\n`);
  }
}
