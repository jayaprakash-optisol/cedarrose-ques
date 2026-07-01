import { describe, expect, it } from "vitest";
import { ApiError } from "@/services/api/errors";

describe("api/errors", () => {
  it("creates an error with code, message, and status", () => {
    const err = new ApiError("CODE", "message", 500);
    expect(err.code).toBe("CODE");
    expect(err.message).toBe("message");
    expect(err.status).toBe(500);
    expect(err.name).toBe("ApiError");
  });

  it("is an instance of Error", () => {
    const err = new ApiError("X", "y", 400);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it("preserves the stack trace", () => {
    const err = new ApiError("X", "y", 400);
    expect(typeof err.stack).toBe("string");
  });
});
