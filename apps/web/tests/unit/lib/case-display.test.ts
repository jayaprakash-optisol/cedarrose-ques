import { describe, it, expect } from "vitest";
import { caseCompanyName, caseCrisUid } from "@/lib/case-display";

describe("case-display", () => {
  it("prefers company data name", () => {
    expect(
      caseCompanyName({
        subjectName: "Legacy",
        companyData: { companyName: "  Acme LLC  " } as never,
      }),
    ).toBe("Acme LLC");
  });

  it("falls back to cris uid fields", () => {
    expect(caseCrisUid({ uid: "", companyData: { registrationNumber: "CR-55" } as never })).toBe("CR-55");
  });

  it("returns subjectName when companyData is absent", () => {
    expect(caseCompanyName({ subjectName: "Plain Name", companyData: undefined as never })).toBe("Plain Name");
  });

  it("returns em-dash when uid and registrationNumber are both absent", () => {
    expect(caseCrisUid({ uid: "", companyData: {} as never })).toBe("—");
  });
});
