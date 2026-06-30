import { describe, it, expect } from "vitest";
import { ERROR_CODES } from "../../../src/shared/errors/error-codes.js";

describe("ERROR_CODES", () => {
  it("exports stable auth and validation codes", () => {
    expect(ERROR_CODES.UNAUTHORIZED).toBe("UNAUTHORIZED");
    expect(ERROR_CODES.FORBIDDEN).toBe("FORBIDDEN");
    expect(ERROR_CODES.NOT_FOUND).toBe("NOT_FOUND");
    expect(ERROR_CODES.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
    expect(ERROR_CODES.INTERNAL_SERVER_ERROR).toBe("INTERNAL_SERVER_ERROR");
    expect(ERROR_CODES.CASE_NOT_FOUND).toBe("CASE_NOT_FOUND");
    expect(ERROR_CODES.INVALID_TRANSITION).toBe("INVALID_TRANSITION");
    expect(ERROR_CODES.EMAIL_TYPO_DETECTED).toBe("EMAIL_TYPO_DETECTED");
    expect(ERROR_CODES.AUTH_INVALID_CREDENTIALS).toBe("AUTH_INVALID_CREDENTIALS");
    expect(ERROR_CODES.ACCOUNT_DISABLED).toBe("ACCOUNT_DISABLED");
    expect(ERROR_CODES.SSRF_BLOCKED).toBe("SSRF_BLOCKED");
  });
});
