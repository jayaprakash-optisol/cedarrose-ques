import type { CaseRecord } from "@/types/case";

/** Prefer linked CRiS company name over legacy subjectName on the case. */
export function caseCompanyName(c: Pick<CaseRecord, "subjectName" | "companyData">): string {
  const name = c.companyData?.companyName?.trim();
  return name || c.subjectName;
}

export function caseCrisUid(c: Pick<CaseRecord, "uid" | "companyData">): string {
  return c.uid || c.companyData?.registrationNumber || "—";
}
