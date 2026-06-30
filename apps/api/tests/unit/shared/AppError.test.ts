import { describe, it, expect } from "vitest";
import { AppError } from "../../../src/shared/errors/AppError.js";

describe("AppError", () => {
  it("carries status code and error code", () => {
    const err = new AppError(404, "NOT_FOUND", "Missing");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Missing");
    expect(err.name).toBe("AppError");
  });
});
