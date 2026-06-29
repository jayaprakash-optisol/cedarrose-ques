/** Fixed UUIDs so `npm run seed` is idempotent (safe to re-run). */
export const SEED = {
  users: {
    admin: "a0000001-0001-4000-8000-000000000001",
    analyst: "a0000001-0001-4000-8000-000000000002",
    researcher: "a0000001-0001-4000-8000-000000000003",
    reviewer: "a0000001-0001-4000-8000-000000000004",
  },
  platforms: {
    adminQuestionnaire: "a0000001-0002-4000-8000-000000000001",
    analystQuestionnaire: "a0000001-0002-4000-8000-000000000002",
    researcherQuestionnaire: "a0000001-0002-4000-8000-000000000003",
  },
  companies: {
    acme: "a0000002-0001-4000-8000-000000000001",
    gulf: "a0000002-0001-4000-8000-000000000002",
  },
  companyEmails: {
    acmePrimary: "a0000002-0002-4000-8000-000000000001",
    acmeSecondary: "a0000002-0002-4000-8000-000000000002",
    gulfPrimary: "a0000002-0002-4000-8000-000000000003",
  },
  templates: {
    supplierActive: "a0000003-0001-4000-8000-000000000001",
    customerDraft: "a0000003-0001-4000-8000-000000000002",
  },
  sections: {
    companyInfo: "a0000004-0001-4000-8000-000000000001",
    compliance: "a0000004-0001-4000-8000-000000000002",
  },
  questions: {
    legalName: "a0000005-0001-4000-8000-000000000001",
    regNumber: "a0000005-0001-4000-8000-000000000002",
    countryOps: "a0000005-0001-4000-8000-000000000003",
    amlPolicy: "a0000005-0001-4000-8000-000000000004",
    sanctions: "a0000005-0001-4000-8000-000000000005",
  },
  cases: {
    sent: "a0000006-0001-4000-8000-000000000001",
    inProgress: "a0000006-0001-4000-8000-000000000002",
    completed: "a0000006-0001-4000-8000-000000000003",
    missingData: "a0000006-0001-4000-8000-000000000004",
    expired: "a0000006-0001-4000-8000-000000000005",
    pendingContact: "a0000006-0001-4000-8000-000000000006",
    pendingLinkage: "a0000006-0001-4000-8000-000000000007",
  },
  responses: {
    inProgress1: "a0000007-0001-4000-8000-000000000001",
    inProgress2: "a0000007-0001-4000-8000-000000000002",
    completed1: "a0000007-0001-4000-8000-000000000003",
    completed2: "a0000007-0001-4000-8000-000000000004",
    completed3: "a0000007-0001-4000-8000-000000000005",
    missing1: "a0000007-0001-4000-8000-000000000006",
  },
  audit: {
    caseCreated: "a0000008-0001-4000-8000-000000000001",
    linkSent: "a0000008-0001-4000-8000-000000000002",
    formOpened: "a0000008-0001-4000-8000-000000000003",
    submitted: "a0000008-0001-4000-8000-000000000004",
    reviewPending: "a0000008-0001-4000-8000-000000000005",
  },
  notifications: {
    submission: "a0000009-0001-4000-8000-000000000001",
    review: "a0000009-0001-4000-8000-000000000002",
    expired: "a0000009-0001-4000-8000-000000000003",
    stale: "a0000009-0001-4000-8000-000000000004",
  },
} as const;

/** Demo questionnaire link token for case `c-seed-001` (POST /questionnaire/verify-link). */
export const DEMO_LINK_TOKEN = "cedarrose_demo_link_token_c001";

export const SEED_PASSWORD = "Password123";

export const SEED_ACCOUNTS = [
  { email: "admin@cedarrose.local", role: "Admin" },
  { email: "analyst@cedarrose.local", role: "Analyst" },
  { email: "researcher@cedarrose.local", role: "Researcher" },
  { email: "reviewer@cedarrose.local", role: "Reviewer" },
] as const;
