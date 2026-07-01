import { describe, expect, it } from "vitest";
import { caseCompanyName, caseCrisUid } from "@/lib/case-display";
import { createMockCase } from "../fixtures/case";

describe("case-display", () => {
  describe("caseCompanyName", () => {
    it("returns the company name when present", () => {
      const c = createMockCase();
      expect(caseCompanyName(c)).toBe("Acme Trading LLC");
    });

    it("falls back to subjectName when companyName is empty", () => {
      const c = createMockCase({
        companyData: {
          ...createMockCase().companyData,
          companyName: "",
        },
      });
      expect(caseCompanyName(c)).toBe("Acme Trading LLC");
    });

    it("falls back to subjectName when companyName is whitespace only", () => {
      const c = createMockCase({
        companyData: {
          ...createMockCase().companyData,
          companyName: "   ",
        },
      });
      expect(caseCompanyName(c)).toBe("Acme Trading LLC");
    });
  });

  describe("caseCrisUid", () => {
    it("returns the case uid when present", () => {
      const c = createMockCase({ uid: "CR-999999" });
      expect(caseCrisUid(c)).toBe("CR-999999");
    });

    it("falls back to company registrationNumber when uid is empty", () => {
      const c = createMockCase({ uid: "" });
      expect(caseCrisUid(c)).toBe("CR-100200");
    });

    it("returns an em-dash when neither is present", () => {
      const c = createMockCase({
        uid: "",
        companyData: {
          ...createMockCase().companyData,
          registrationNumber: "",
        },
      });
      expect(caseCrisUid(c)).toBe("—");
    });
  });
});
