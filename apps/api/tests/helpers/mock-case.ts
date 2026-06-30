import type { cases } from "../../src/db/schema/cases.js";

type CaseRow = typeof cases.$inferSelect;

export function createMockCase(overrides: Partial<CaseRow> = {}): CaseRow {
  return {
    caseId: "22222222-2222-2222-2222-222222222222",
    caseRef: "c-001",
    orderId: "ORD-1001",
    companyId: null,
    subjectName: "Acme Corp",
    country: "GB",
    recipientType: "Supplier",
    status: "SENT",
    completionMandatory: 0,
    completionOptional: 0,
    dateSubmitted: null,
    dateDispatched: new Date("2026-06-01T10:00:00.000Z"),
    firstOpenedAt: null,
    dateReceived: new Date("2026-06-01T09:00:00.000Z"),
    lastActivity: null,
    analystId: "11111111-1111-1111-1111-111111111111",
    assignedResearcherId: null,
    researcherStatus: null,
    researcherNotes: null,
    researcherReviewedAt: null,
    apiPushStatus: "Pending",
    apiPushAt: null,
    currentStep: 1,
    linkTokenHash: "hash",
    linkExpiry: new Date("2026-06-03T10:00:00.000Z"),
    linkValidityHours: 48,
    remindersSent: 0,
    resentCount: 0,
    templateId: "33333333-3333-3333-3333-333333333333",
    templateVersion: 1,
    createdAt: new Date("2026-06-01T09:00:00.000Z"),
    updatedAt: new Date("2026-06-01T09:00:00.000Z"),
    ...overrides,
  };
}
