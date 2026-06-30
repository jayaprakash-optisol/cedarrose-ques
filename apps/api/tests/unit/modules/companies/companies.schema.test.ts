import { describe, it, expect } from "vitest";
import { createCompanySchema, updateCompanySchema } from "../../../../src/modules/companies/companies.schema.js";

describe("companies schemas", () => {
  it("requires company name and cris number", () => {
    expect(createCompanySchema.parse({ companyName: "A", crisNumber: "CR-1" }).companyName).toBe("A");
  });

  it("allows partial company updates", () => {
    expect(updateCompanySchema.parse({ country: "AE" }).country).toBe("AE");
  });
});
