import { describe, it, expect } from "vitest";
import { createCaseSchema, researcherReviewSchema } from "../../../../src/modules/cases/cases.schema.js";
import { createCompanySchema, updateCompanySchema } from "../../../../src/modules/companies/companies.schema.js";
import { replaceConfigSchema } from "../../../../src/modules/config/config.schema.js";
import {
  createTemplateSchema,
  replaceTemplateSchema,
  updateTemplateStatusSchema,
} from "../../../../src/modules/templates/templates.schema.js";
import { inviteUserSchema, updateUserSchema } from "../../../../src/modules/users/users.schema.js";
import {
  verifyLinkSchema,
  authenticateSchema,
  otpVerifySchema,
  saveProgressSchema,
} from "../../../../src/modules/questionnaire/questionnaire.schema.js";

describe("cases.schema", () => {
  it("accepts valid create case payload", () => {
    const result = createCaseSchema.parse({
      orderId: "ORD-1",
      subjectName: "Acme",
      country: "GB",
      recipientType: "Supplier",
      recipientEmail: "user@example.com",
    });
    expect(result.linkValidityHours).toBe(48);
  });

  it("rejects invalid recipient type", () => {
    expect(() =>
      createCaseSchema.parse({
        orderId: "ORD-1",
        subjectName: "Acme",
        country: "GB",
        recipientType: "Invalid",
      })
    ).toThrow();
  });

  it("accepts researcher review decisions", () => {
    expect(researcherReviewSchema.parse({ decision: "Approved" }).decision).toBe("Approved");
  });
});

describe("companies.schema", () => {
  it("accepts valid company create", () => {
    const result = createCompanySchema.parse({
      companyName: "Acme",
      crisNumber: "CR-1",
      recipientEmails: ["a@test.com"],
    });
    expect(result.riskRating).toBeUndefined();
  });

  it("rejects empty company name on update", () => {
    expect(() => updateCompanySchema.parse({ companyName: "" })).toThrow();
  });
});

describe("config.schema", () => {
  it("accepts partial config updates", () => {
    const result = replaceConfigSchema.parse({
      linkValidityDays: 30,
      exportFormat: "json",
      gamificationEnabled: true,
    });
    expect(result.linkValidityDays).toBe(30);
    expect(result.exportFormat).toBe("json");
  });

  it("rejects invalid export format", () => {
    expect(() => replaceConfigSchema.parse({ exportFormat: "xml" })).toThrow();
  });
});

describe("templates.schema", () => {
  const section = {
    title: "General",
    orderIndex: 0,
    questions: [{ label: "Name", fieldType: "text", mandatory: true }],
  };

  it("accepts create template payload", () => {
    const result = createTemplateSchema.parse({ name: "Template A", sections: [section] });
    expect(result.name).toBe("Template A");
  });

  it("requires sections on replace", () => {
    expect(() => replaceTemplateSchema.parse({ name: "Template A" })).toThrow();
    expect(replaceTemplateSchema.parse({ name: "Template A", sections: [section] }).sections).toHaveLength(1);
  });

  it("accepts template status updates", () => {
    expect(updateTemplateStatusSchema.parse({ status: "Draft" }).status).toBe("Draft");
  });
});

describe("users.schema", () => {
  it("accepts invite payload", () => {
    const result = inviteUserSchema.parse({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@test.com",
      role: "Analyst",
      platforms: [{ platform: "automation", role: "Analyst" }],
    });
    expect(result.email).toBe("ada@test.com");
  });

  it("accepts partial user updates", () => {
    const result = updateUserSchema.parse({ firstName: "Updated", status: "Active" });
    expect(result.firstName).toBe("Updated");
  });

  it("rejects invalid invite email", () => {
    expect(() =>
      inviteUserSchema.parse({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "bad",
        role: "Analyst",
      })
    ).toThrow();
  });
});

describe("questionnaire.schema", () => {
  it("accepts verify and authenticate tokens", () => {
    expect(verifyLinkSchema.parse({ token: "abc" }).token).toBe("abc");
    expect(authenticateSchema.parse({ token: "abc" }).token).toBe("abc");
  });

  it("accepts otp verification payload", () => {
    expect(otpVerifySchema.parse({ token: "abc", otp: "123456" }).otp).toBe("123456");
  });

  it("accepts save progress responses", () => {
    const result = saveProgressSchema.parse({
      responses: [{ question: "Company name", answer: "Acme" }],
    });
    expect(result.responses).toHaveLength(1);
  });

  it("rejects short otp", () => {
    expect(() => otpVerifySchema.parse({ token: "abc", otp: "12" })).toThrow();
  });
});
