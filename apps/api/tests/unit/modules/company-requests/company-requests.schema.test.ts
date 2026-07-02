import { describe, it, expect } from "vitest";
import {
  webhookCompanyRequestSchema,
  listCompanyRequestsQuerySchema,
} from "../../../../src/modules/company-requests/company-requests.schema.js";

const validPayload = {
  orderId: "ORD-10001",
  externalRef: "UID-44529",
  companyName: "Acme Trading LLC",
  country: "UAE",
  recipientEmails: ["contact@acme.example"],
};

describe("webhookCompanyRequestSchema", () => {
  it("accepts a minimal valid payload", () => {
    const parsed = webhookCompanyRequestSchema.parse(validPayload);
    expect(parsed.orderId).toBe("ORD-10001");
    expect(parsed.recipientEmails).toEqual(["contact@acme.example"]);
  });

  it("accepts optional company detail fields", () => {
    const parsed = webhookCompanyRequestSchema.parse({
      ...validPayload,
      riskRating: "Medium",
      incorporationDate: "2015-04-01",
      legalStructure: "Limited Liability Company",
      primaryIndustry: "General Trading",
      recipientType: "Supplier",
    });
    expect(parsed.riskRating).toBe("Medium");
    expect(parsed.recipientType).toBe("Supplier");
  });

  it.each([
    ["orderId", { ...validPayload, orderId: "" }],
    ["externalRef", { ...validPayload, externalRef: "" }],
    ["companyName", { ...validPayload, companyName: "" }],
    ["country", { ...validPayload, country: "" }],
  ])("rejects an empty %s", (_field, payload) => {
    expect(() => webhookCompanyRequestSchema.parse(payload)).toThrow();
  });

  it("rejects a missing required field", () => {
    const { orderId: _omitted, ...withoutOrderId } = validPayload;
    expect(() => webhookCompanyRequestSchema.parse(withoutOrderId)).toThrow();
  });

  it("rejects an empty recipientEmails array", () => {
    expect(() =>
      webhookCompanyRequestSchema.parse({ ...validPayload, recipientEmails: [] }),
    ).toThrow();
  });

  it("rejects malformed recipient emails", () => {
    expect(() =>
      webhookCompanyRequestSchema.parse({ ...validPayload, recipientEmails: ["not-an-email"] }),
    ).toThrow();
  });

  it("rejects an unknown risk rating", () => {
    expect(() =>
      webhookCompanyRequestSchema.parse({ ...validPayload, riskRating: "Severe" }),
    ).toThrow();
  });

  it("rejects an unknown recipient type", () => {
    expect(() =>
      webhookCompanyRequestSchema.parse({ ...validPayload, recipientType: "Vendor" }),
    ).toThrow();
  });
});

describe("listCompanyRequestsQuerySchema", () => {
  it("accepts Pending and Used statuses", () => {
    expect(listCompanyRequestsQuerySchema.parse({ status: "Pending" }).status).toBe("Pending");
    expect(listCompanyRequestsQuerySchema.parse({ status: "Used" }).status).toBe("Used");
  });

  it("accepts an omitted status", () => {
    expect(listCompanyRequestsQuerySchema.parse({}).status).toBeUndefined();
  });

  it("rejects an unknown status", () => {
    expect(() => listCompanyRequestsQuerySchema.parse({ status: "Archived" })).toThrow();
  });
});
