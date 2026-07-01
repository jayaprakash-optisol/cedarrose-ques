import type { ErrorRequestHandler, Request } from "express";
import { ZodError } from "zod";
import { AppError } from "../shared/errors/AppError.js";
import { failure } from "../shared/utils/response.js";
import { isDatabaseError, toDatabaseErrorResponse } from "../shared/utils/db-error.js";
import { formatZodError } from "../shared/utils/validation-error.js";
import { logDevError } from "../config/logger.js";

export { logger } from "../config/logger.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = String((req as Request).id ?? "");
  const method = req.method;
  const path = req.originalUrl;

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logDevError(`${method} ${path} AppError`, err, { requestId, code: err.code });
    }
    return res.status(err.statusCode).json(failure(err.code, err.message, requestId));
  }

  if (err instanceof ZodError) {
    return res.status(422).json(failure("VALIDATION_ERROR", formatZodError(err), requestId));
  }

  if (err instanceof SyntaxError && "body" in err) {
    return res
      .status(400)
      .json(failure("INVALID_JSON", "Request body contains invalid JSON. Check quotes and commas.", requestId));
  }

  if (isDatabaseError(err)) {
    const dbError = toDatabaseErrorResponse(err);
    logDevError(`${method} ${path} database`, err, { requestId, code: dbError.code });
    return res.status(dbError.statusCode).json(failure(dbError.code, dbError.message, requestId));
  }

  logDevError(`${method} ${path} unhandled`, err, { requestId });
  return res.status(500).json(failure("INTERNAL_SERVER_ERROR", "Something went wrong. Please try again.", requestId));
};
