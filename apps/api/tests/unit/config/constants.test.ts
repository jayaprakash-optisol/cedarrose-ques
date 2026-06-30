import { describe, it, expect } from "vitest";
import { CASE_STATUSES, RECIPIENT_TYPES, USER_ROLES, STATUS_PRIORITY } from "../../../src/config/constants.js";

describe("constants", () => {
  it("includes expected case statuses", () => {
    expect(CASE_STATUSES).toContain("SENT");
    expect(CASE_STATUSES).toContain("COMPLETED");
  });

  it("defines recipient types and roles", () => {
    expect(RECIPIENT_TYPES).toContain("Supplier");
    expect(USER_ROLES).toContain("Admin");
  });

  it("assigns priority ordering for statuses", () => {
    expect(STATUS_PRIORITY["PENDING LINKAGE & CONTACT"]).toBeLessThan(STATUS_PRIORITY.COMPLETED);
  });
});
