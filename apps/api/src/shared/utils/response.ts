import type { Response } from "express";
import type { PaginationMeta } from "../types/common.js";

export function success<T>(data: T, message?: string, meta?: PaginationMeta) {
  return {
    success: true as const,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  };
}

export function failure(code: string, message: string, requestId?: string) {
  return {
    success: false as const,
    error: {
      code,
      message,
      ...(requestId && { requestId }),
    },
  };
}

export function sendSuccess<T>(res: Response, data: T, status = 200, message?: string, meta?: PaginationMeta) {
  res.status(status).json(success(data, message, meta));
}

export function sendError(res: Response, status: number, message: string, code = "ERROR") {
  res.status(status).json(failure(code, message));
}
