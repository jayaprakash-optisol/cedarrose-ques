import type { CaseRecord, CompanyData, QuestionnaireResponse } from "@/types/case";

export function createMockCompany(overrides: Partial<CompanyData> = {}): CompanyData {
  return {
    companyName: "Acme Trading LLC",
    registrationNumber: "CR-100200",
    country: "UAE",
    riskRating: "Low",
    recipientEmails: ["ops@acme.example"],
    additionalFields: {
      incorporationDate: "2018-04-01",
      legalStructure: "LLC",
      primaryIndustry: "Trading",
    },
    ...overrides,
  };
}

export function createMockResponse(overrides: Partial<QuestionnaireResponse> = {}): QuestionnaireResponse {
  return {
    question: "What is the registered trade name?",
    answer: "Acme Trading",
    mandatory: true,
    ...overrides,
  };
}

export function createMockCase(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: "case-123",
    orderId: "ORD-9001",
    uid: "CR-100200",
    subjectName: "Acme Trading LLC",
    country: "UAE",
    recipientType: "Supplier",
    status: "SENT",
    completionMandatory: { done: 0, total: 100 },
    completionOptional: { done: 0, total: 100 },
    requestedDate: "2026-06-01T09:00:00.000Z",
    lastActivity: "2026-06-01T09:00:00.000Z",
    researcherStatus: "Not Applicable",
    companyData: createMockCompany(),
    link: {
      sentAt: "2026-06-01T09:00:00.000Z",
      firstOpenedAt: undefined,
      expiresAt: "2027-01-01T09:00:00.000Z",
      resentCount: 0,
    },
    responses: [],
    currentStep: 1,
    analyst: "Jane Analyst",
    linkExpiry: "2027-01-03T09:00:00.000Z",
    linkValidityHours: 48,
    remindersSent: 0,
    stepTimestamps: undefined,
    linkUrl: null,
    ...overrides,
  };
}
