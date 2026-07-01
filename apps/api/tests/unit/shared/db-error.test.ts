import { describe, it, expect } from "vitest";
import { isDatabaseError, toDatabaseErrorResponse } from "../../../src/shared/utils/db-error.js";

describe("db-error utils", () => {
  it("detects drizzle and pg wrapped errors", () => {
    const drizzle = new Error("query failed");
    drizzle.name = "DrizzleQueryError";
    expect(isDatabaseError(drizzle)).toBe(true);

    const wrapped = new Error("failed", {
      cause: { code: "23505", constraint: "users_email_key", detail: "email" },
    });
    expect(isDatabaseError(wrapped)).toBe(true);
  });

  it("maps duplicate email to 409", () => {
    const err = new Error("dup", { cause: { code: "23505", detail: "email already exists" } });
    expect(toDatabaseErrorResponse(err)).toMatchObject({ statusCode: 409, code: "DUPLICATE_EMAIL" });
  });

  it("maps foreign key violations to invalid reference", () => {
    const err = new Error("fk", { cause: { code: "23503" } });
    expect(toDatabaseErrorResponse(err)).toMatchObject({ code: "INVALID_REFERENCE" });
  });

  it("maps generic duplicate records to 409", () => {
    const err = new Error("dup", { cause: { code: "23505", constraint: "users_pkey" } });
    expect(toDatabaseErrorResponse(err)).toMatchObject({ statusCode: 409, code: "DUPLICATE_RECORD" });
  });

  it("maps missing required field and invalid value errors", () => {
    expect(toDatabaseErrorResponse(new Error("null", { cause: { code: "23502" } }))).toMatchObject({
      code: "MISSING_REQUIRED_FIELD",
    });
    expect(toDatabaseErrorResponse(new Error("bad uuid", { cause: { code: "22P02" } }))).toMatchObject({
      code: "INVALID_VALUE",
    });
  });

  it("falls back to generic database error", () => {
    const err = new Error("unknown", { cause: { code: "99999" } });
    expect(toDatabaseErrorResponse(err)).toMatchObject({ statusCode: 500, code: "DATABASE_ERROR" });
    expect(isDatabaseError(new Error("plain"))).toBe(false);
    expect(isDatabaseError(null)).toBe(false);
  });

  it("handles null and non-error inputs", () => {
    expect(toDatabaseErrorResponse(null)).toMatchObject({ statusCode: 500, code: "DATABASE_ERROR" });
    expect(toDatabaseErrorResponse(undefined)).toMatchObject({ statusCode: 500, code: "DATABASE_ERROR" });
    expect(toDatabaseErrorResponse("string")).toMatchObject({ statusCode: 500, code: "DATABASE_ERROR" });
    expect(isDatabaseError("not an error")).toBe(false);
    expect(isDatabaseError({})).toBe(false);
  });
});
