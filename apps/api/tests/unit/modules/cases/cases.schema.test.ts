import { describe, it, expect } from "vitest";
import { createCaseSchema, researcherReviewSchema } from "../../../../src/modules/cases/cases.schema.js";

describe("cases schemas", () => {
  it("validates create case payload", () => {
    const parsed = createCaseSchema.parse({
      orderId: "ORD-1",
      subjectName: "Acme",
      country: "AE",
      recipientType: "Supplier",
      recipientEmail: "a@b.com",
    });
    expect(parsed.linkValidityHours).toBe(48);
  });

  it("rejects invalid recipient type", () => {
    expect(() =>
      createCaseSchema.parse({
        orderId: "ORD-1",
        subjectName: "Acme",
        country: "AE",
        recipientType: "Invalid",
      }),
    ).toThrow();
  });

  it("validates researcher review decision", () => {
    expect(researcherReviewSchema.parse({ decision: "Approved" }).decision).toBe("Approved");
  });
});
