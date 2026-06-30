import type { CaseRecord } from "@/types/case";

export function makeCase(overrides: Partial<CaseRecord> = {}): CaseRecord {
  const future = new Date();
  future.setDate(future.getDate() + 5);

  return {
    id: "c-test",
    orderId: "ORD-10001",
    uid: "UID-44529",
    subjectName: "Test Holdings Ltd",
    country: "UAE",
    recipientType: "Supplier",
    status: "SENT",
    completionMandatory: { done: 3, total: 10 },
    completionOptional: { done: 0, total: 2 },
    requestedDate: "2026-06-01T10:00:00.000Z",
    lastActivity: "2026-06-24T10:00:00.000Z",
    researcherStatus: "Not Applicable",
    companyData: {
      companyName: "Test Holdings Ltd",
      registrationNumber: "CR-123456",
      country: "UAE",
      riskRating: "Medium",
      recipientEmails: ["compliance@test.ae"],
      additionalFields: {
        incorporationDate: "2015-03-12",
        legalStructure: "LLC",
        primaryIndustry: "Trading",
      },
    },
    link: { resentCount: 0, expiresAt: future.toISOString() },
    responses: [
      { question: "Legal entity name", mandatory: true, answer: "Test Holdings Ltd" },
    ],
    currentStep: 5,
    analyst: "David Chen",
    linkExpiry: future.toISOString(),
    remindersSent: 1,
    ...overrides,
  };
}

export const mockCases: CaseRecord[] = [
  makeCase(),
  makeCase({
    id: "c-expired",
    orderId: "ORD-10002",
    status: "EXPIRED",
    subjectName: "Expired Corp",
    companyData: {
      companyName: "Expired Corp",
      registrationNumber: "CR-999999",
      country: "UAE",
      riskRating: "High",
      recipientEmails: ["expired@corp.ae"],
      additionalFields: {
        incorporationDate: "2010-01-01",
        legalStructure: "LLC",
        primaryIndustry: "Trading",
      },
    },
    linkExpiry: "2026-01-01T00:00:00.000Z",
  }),
];
