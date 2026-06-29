interface PgError extends Error {
  code?: string;
  detail?: string;
  column?: string;
  constraint?: string;
}

function getPgCause(err: unknown): PgError | undefined {
  if (!err || typeof err !== "object") return undefined;
  const cause = (err as { cause?: unknown }).cause;
  if (cause && typeof cause === "object" && "code" in cause) {
    return cause as PgError;
  }
  return undefined;
}

export function isDatabaseError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === "DrizzleQueryError") return true;
  return getPgCause(err) !== undefined;
}

export function toDatabaseErrorResponse(err: unknown): { statusCode: number; code: string; message: string } {
  const pg = getPgCause(err);

  if (pg?.code === "23505") {
    if (pg.constraint?.includes("email") || pg.detail?.toLowerCase().includes("email")) {
      return { statusCode: 409, code: "DUPLICATE_EMAIL", message: "A user with this email already exists." };
    }
    return { statusCode: 409, code: "DUPLICATE_RECORD", message: "This record already exists." };
  }

  if (pg?.code === "23503") {
    return { statusCode: 400, code: "INVALID_REFERENCE", message: "A related record could not be found." };
  }

  if (pg?.code === "23502") {
    return { statusCode: 400, code: "MISSING_REQUIRED_FIELD", message: "A required field is missing." };
  }

  if (pg?.code === "22P02") {
    return { statusCode: 400, code: "INVALID_VALUE", message: "One or more values are invalid." };
  }

  return {
    statusCode: 500,
    code: "DATABASE_ERROR",
    message: "A database error occurred. Please try again.",
  };
}
