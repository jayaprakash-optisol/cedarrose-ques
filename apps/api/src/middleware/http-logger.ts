import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger.js";

const QUIET_PATHS = new Set(["/health", "/favicon.ico"]);

function shouldSkipLog(req: Request): boolean {
  if (req.method === "OPTIONS") return true;

  const path = req.originalUrl.split("?")[0];
  if (QUIET_PATHS.has(path)) return true;
  if (path.startsWith("/api/docs")) return true;

  return false;
}

export function httpLogger(req: Request, res: Response, next: NextFunction): void {
  if (shouldSkipLog(req)) {
    next();
    return;
  }

  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const status = res.statusCode;
    const requestId = req.id ?? "unknown";
    const line = `${req.method} ${req.originalUrl} → ${status} (${Math.round(durationMs)}ms)`;

    if (status >= 500) {
      logger.error({ requestId, statusCode: status, durationMs }, line);
      return;
    }

    if (status >= 400) {
      logger.warn({ requestId, statusCode: status, durationMs }, line);
      return;
    }

    logger.info({ requestId, statusCode: status, durationMs }, line);
  });

  next();
}
