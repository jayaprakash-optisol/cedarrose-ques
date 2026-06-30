import { describe, it, expect } from "vitest";
import { ApiError } from "@/services/api/errors";

describe("ApiError", () => {
  it("exposes code, message, and status for client handling", () => {
    const error = new ApiError("VALIDATION_ERROR", "Invalid token", 400);
    expect(error.name).toBe("ApiError");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("Invalid token");
    expect(error.status).toBe(400);
  });
});
