import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiAuditEvent, ApiCase, ApiPlatformConfig, ApiTemplate, ApiUser } from "@/services/api/mappers";
import {
  isLocalTemplateId,
  isLocalUserId,
  mapAuditEvent,
  mapCase,
  mapCompany,
  mapCurrentUser,
  mapNotification,
  mapNotificationPreferences,
  mapPlatformConfig,
  mapPlatformConfigToApi,
  mapQuestionnaireFormData,
  mapTemplate,
  mapTemplateToApi,
  mapUser,
  splitName,
  toApiRole,
  toRoleKey,
} from "@/services/api/mappers";

const FIXED_NOW = new Date("2026-06-15T12:00:00.000Z");

const baseApiUser: ApiUser = {
  userId: "u1",
  email: "u@example.com",
  firstName: "U",
  lastName: "One",
  role: "Admin",
  status: "Active",
  title: "Admin",
  initials: "UO",
  totalReports: 5,
  score: "4.5",
  lastSubmission: "2026-06-10T10:00:00.000Z",
  platforms: [{ platform: "P1", role: "R" }],
  notifyOnSubmission: true,
  notifyOnLinkExpiry: false,
  notifyOnBlockedDispatch: true,
  notifyOnRemindersSent: false,
};

const baseApiCase: ApiCase = {
  caseId: "c1",
  caseRef: "ref-1",
  orderId: "O1",
  subjectName: "Acme",
  country: "UAE",
  recipientType: "Supplier",
  status: "SENT",
  completionMandatory: 50,
  completionOptional: 25,
  dateReceived: "2026-06-01T00:00:00.000Z",
  dateDispatched: "2026-06-02T00:00:00.000Z",
  lastActivity: "2026-06-02T00:00:00.000Z",
  currentStep: 1,
  linkExpiry: "2026-06-09T00:00:00.000Z",
  linkValidityHours: 168,
  remindersSent: 0,
  company: {
    companyName: "Acme Trading",
    crisNumber: "CR-100",
    country: "UAE",
    riskRating: "Low",
    recipientEmails: ["a@b.com"],
  },
};

describe("services/api/mappers", () => {
  beforeEach(() => {
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("toRoleKey", () => {
    it("lowercases the role", () => {
      expect(toRoleKey("Admin")).toBe("admin");
      expect(toRoleKey("Researcher")).toBe("researcher");
    });
  });

  describe("toApiRole", () => {
    it("uppercases the first letter", () => {
      expect(toApiRole("admin")).toBe("Admin");
      expect(toApiRole("analyst")).toBe("Analyst");
    });
  });

  describe("splitName", () => {
    it("returns an empty first name for empty input", () => {
      expect(splitName("")).toEqual({ firstName: "", lastName: "" });
    });
    it("returns the single token", () => {
      expect(splitName("John")).toEqual({ firstName: "John", lastName: "" });
    });
    it("splits multi-word names", () => {
      expect(splitName("John Q Public")).toEqual({ firstName: "John", lastName: "Q Public" });
    });
  });

  describe("isLocalUserId", () => {
    it("returns true for USR- prefix", () => {
      expect(isLocalUserId("USR-123")).toBe(true);
    });
    it("returns true for non-UUID ids", () => {
      expect(isLocalUserId("user-1")).toBe(true);
    });
    it("returns false for real-shaped UUIDs", () => {
      expect(isLocalUserId("11111111-1111-1111-1111-111111111111")).toBe(false);
    });
  });

  describe("isLocalTemplateId", () => {
    it("returns true for tpl- prefix", () => {
      expect(isLocalTemplateId("tpl-1")).toBe(true);
    });
    it("returns true for non-UUID ids", () => {
      expect(isLocalTemplateId("abc")).toBe(true);
    });
    it("returns false for real-shaped UUIDs", () => {
      expect(isLocalTemplateId("11111111-1111-1111-1111-111111111111")).toBe(false);
    });
  });

  describe("mapNotificationPreferences", () => {
    it("uses the user-supplied values", () => {
      const out = mapNotificationPreferences(baseApiUser);
      expect(out).toEqual({
        notifyOnSubmission: true,
        notifyOnLinkExpiry: false,
        notifyOnBlockedDispatch: true,
        notifyOnRemindersSent: false,
      });
    });
    it("defaults all to true when missing", () => {
      const out = mapNotificationPreferences({ ...baseApiUser, notifyOnSubmission: undefined, notifyOnLinkExpiry: undefined, notifyOnBlockedDispatch: undefined, notifyOnRemindersSent: undefined });
      expect(out).toEqual({
        notifyOnSubmission: true,
        notifyOnLinkExpiry: true,
        notifyOnBlockedDispatch: true,
        notifyOnRemindersSent: true,
      });
    });
  });

  describe("mapCurrentUser", () => {
    it("derives name, role, title, and initials", () => {
      const u = mapCurrentUser(baseApiUser);
      expect(u).toEqual({
        id: "u1",
        name: "U One",
        email: "u@example.com",
        role: "admin",
        title: "Admin",
        initials: "UO",
      });
    });
    it("falls back to initials from firstName/lastName when missing", () => {
      const u = mapCurrentUser({ ...baseApiUser, initials: null });
      expect(u.initials).toBe("UO");
    });
    it("handles missing firstName/lastName", () => {
      const u = mapCurrentUser({ ...baseApiUser, firstName: "", lastName: "", initials: null });
      expect(u.initials).toBe("");
    });
  });

  describe("mapUser", () => {
    it("maps a user with a string score", () => {
      const u = mapUser(baseApiUser);
      expect(u.id).toBe("u1");
      expect(u.name).toBe("U One");
      expect(u.score).toBe(4.5);
      expect(u.status).toBe("Active");
      expect(u.role).toBe("admin");
      expect(u.platforms).toEqual(["P1"]);
    });
    it("maps a user with a numeric score", () => {
      const u = mapUser({ ...baseApiUser, score: 3.7 });
      expect(u.score).toBe(3.7);
    });
    it("maps a null score to null", () => {
      const u = mapUser({ ...baseApiUser, score: null });
      expect(u.score).toBeNull();
    });
    it("maps a non-finite score to null", () => {
      const u = mapUser({ ...baseApiUser, score: "not-a-number" });
      expect(u.score).toBeNull();
    });
    it("maps a non-string, non-null lastSubmission to null", () => {
      const u = mapUser({ ...baseApiUser, lastSubmission: null });
      expect(u.lastSubmission).toBeNull();
    });
    it("normalises Pending status", () => {
      const u = mapUser({ ...baseApiUser, status: "Pending" });
      expect(u.status).toBe("Pending");
    });
    it("normalises unknown status to Inactive", () => {
      const u = mapUser({ ...baseApiUser, status: "Other" });
      expect(u.status).toBe("Inactive");
    });
  });

  describe("mapCompany", () => {
    it("maps a company", () => {
      const co = mapCompany({
        companyId: "co-1",
        companyName: "Acme",
        crisNumber: "CR-1",
        country: "UAE",
        riskRating: "Low",
        recipientEmails: ["a@b.com"],
        incorporationDate: "2018-01-01",
        legalStructure: "LLC",
        primaryIndustry: "Trading",
      });
      expect(co.companyName).toBe("Acme");
      expect(co.registrationNumber).toBe("CR-1");
    });
    it("normalises non-array recipientEmails to []", () => {
      const co = mapCompany({
        companyId: "co-1",
        companyName: "A",
        crisNumber: "C",
        country: "UAE",
        riskRating: "Low",
        recipientEmails: undefined as unknown as string[],
      });
      expect(co.recipientEmails).toEqual([]);
    });
    it("unwraps object recipientEmails entries", () => {
      const co = mapCompany({
        companyId: "co-1",
        companyName: "A",
        crisNumber: "C",
        country: "UAE",
        riskRating: "Low",
        recipientEmails: [{ email: "x@y.com" } as unknown as string],
      });
      expect(co.recipientEmails).toEqual(["x@y.com"]);
    });

    it("coerces unknown recipientEmails entries via String()", () => {
      const co = mapCompany({
        companyId: "co-1",
        companyName: "A",
        crisNumber: "C",
        country: "UAE",
        riskRating: "Low",
        recipientEmails: [42 as unknown as string],
      });
      expect(co.recipientEmails).toEqual(["42"]);
    });
  });

  describe("mapCase", () => {
    it("maps a case with company and an explicit uid", () => {
      const c = mapCase(baseApiCase, null, "OVERRIDE-1");
      expect(c.id).toBe("c1");
      expect(c.uid).toBe("OVERRIDE-1");
      expect(c.companyData.companyName).toBe("Acme Trading");
      expect(c.analyst).toBe("—");
      expect(c.linkExpiry).toBe("2026-06-09T00:00:00.000Z");
      expect(c.linkValidityHours).toBe(168);
      expect(c.remindersSent).toBe(0);
    });

    it("falls back to defaults when company fields are null", () => {
      const c = mapCase({
        ...baseApiCase,
        company: {
          companyName: "X",
          crisNumber: "CR",
          country: null,
          riskRating: null,
          recipientEmails: null as unknown as string[],
          incorporationDate: null,
          legalStructure: null,
          primaryIndustry: null,
        },
      });
      expect(c.companyData.country).toBe("");
      expect(c.companyData.riskRating).toBe("Low");
      expect(c.companyData.recipientEmails).toEqual([]);
      expect(c.companyData.additionalFields.incorporationDate).toBe("");
    });

    it("clamps completion percentages to 0–100 even with out-of-range values", () => {
      const c = mapCase({
        ...baseApiCase,
        completionMandatory: 200 as number,
        completionOptional: -5 as number,
      });
      expect(c.completionMandatory.done).toBe(100);
      expect(c.completionOptional.done).toBe(0);
    });

    it("treats nullish completion percentages as 0", () => {
      const c = mapCase({
        ...baseApiCase,
        completionMandatory: null as unknown as number,
        completionOptional: null as unknown as number,
      });
      expect(c.completionMandatory.done).toBe(0);
      expect(c.completionOptional.done).toBe(0);
    });

    it("falls back to subjectName when no company is provided", () => {
      const c = mapCase({ ...baseApiCase, company: null }, null);
      expect(c.companyData.companyName).toBe("Acme");
      expect(c.companyData.country).toBe("UAE");
    });

    it("uses provided companyData argument", () => {
      const c = mapCase(baseApiCase, {
        companyName: "Overridden",
        registrationNumber: "X",
        country: "GB",
        riskRating: "High",
        recipientEmails: [],
        additionalFields: { incorporationDate: "", legalStructure: "", primaryIndustry: "" },
      });
      expect(c.companyData.companyName).toBe("Overridden");
    });

    it("defaults linkValidityHours to 48 when missing", () => {
      const c = mapCase({ ...baseApiCase, linkValidityHours: undefined });
      expect(c.linkValidityHours).toBe(48);
    });

    it("defaults remindersSent to null when missing", () => {
      const c = mapCase({ ...baseApiCase, remindersSent: undefined });
      expect(c.remindersSent).toBeNull();
    });

    it("maps researcher status to a decision", () => {
      expect(mapCase({ ...baseApiCase, researcherStatus: "Approved" }).researcherDecision).toBe("Approved");
      expect(mapCase({ ...baseApiCase, researcherStatus: "Flagged" }).researcherDecision).toBe("Flagged");
      expect(mapCase({ ...baseApiCase, researcherStatus: "Rejected" }).researcherDecision).toBe("Rejected");
      expect(mapCase({ ...baseApiCase, researcherStatus: null }).researcherDecision).toBeUndefined();
    });

    it("falls back researcherStatus to 'Not Applicable'", () => {
      const c = mapCase({ ...baseApiCase, researcherStatus: null });
      expect(c.researcherStatus).toBe("Not Applicable");
    });

    it("uses analystName when present", () => {
      const c = mapCase({ ...baseApiCase, analystName: "Jane" });
      expect(c.analyst).toBe("Jane");
    });

    it("uses company.crisNumber as the uid when no override", () => {
      const c = mapCase(baseApiCase);
      expect(c.uid).toBe("CR-100");
    });

    it("maps response entries with default mandatory=false and answer=''", () => {
      const c = mapCase({ ...baseApiCase, responses: [{ question: "Q" }] });
      expect(c.responses[0].answer).toBe("");
      expect(c.responses[0].mandatory).toBe(false);
    });

    it("returns empty responses when undefined", () => {
      const c = mapCase({ ...baseApiCase, responses: undefined });
      expect(c.responses).toEqual([]);
    });
  });

  describe("mapAuditEvent", () => {
    it("maps an event", () => {
      const e = mapAuditEvent({
        auditId: "a1",
        caseId: "c1",
        caseSubject: "Acme",
        caseOrderId: "O1",
        step: 1,
        eventType: "API Call",
        description: "step",
        triggeredBy: "system",
        status: "Success",
        createdAt: "2026-06-01T10:00:00.000Z",
        caseStatus: "SENT",
        payload: { x: 1 },
      } as ApiAuditEvent);
      expect(e).toMatchObject({
        id: "a1",
        caseId: "c1",
        step: 1,
        type: "API Call",
        status: "Success",
        triggeredBy: "system",
        caseStatus: "SENT",
        payload: { x: 1 },
      });
    });

    it("defaults missing fields", () => {
      const e = mapAuditEvent({
        auditId: "a2",
        eventType: "API Call",
        description: "step",
        status: "Success",
        createdAt: "2026-06-01T10:00:00.000Z",
      } as ApiAuditEvent);
      expect(e.caseId).toBe("");
      expect(e.step).toBe(0);
      expect(e.triggeredBy).toBe("System");
      expect(e.caseStatus).toBeUndefined();
      expect(e.payload).toBeUndefined();
    });
  });

  describe("mapNotification", () => {
    it("maps a notification", () => {
      const n = mapNotification({
        notificationId: "n1",
        userId: "u1",
        type: "submission",
        title: "T",
        body: "B",
        read: false,
        caseId: "c1",
        createdAt: "2026-06-01T10:00:00.000Z",
      });
      expect(n.id).toBe("n1");
      expect(n.caseId).toBe("c1");
      expect(typeof n.time).toBe("string");
    });

    it("preserves stale type as 'stale'", () => {
      const n = mapNotification({
        notificationId: "n1",
        userId: "u1",
        type: "stale",
        title: "T",
        body: "B",
        read: true,
        createdAt: "2026-06-01T10:00:00.000Z",
      });
      expect(n.type).toBe("stale");
    });
  });

  describe("mapPlatformConfig", () => {
    const cfg: ApiPlatformConfig = {
      configId: "cfg-1",
      linkValidityDays: 2,
      tokenType: "JWT",
      tokenExpiryValue: 24,
      tokenExpiryUnit: "hours",
      otpLength: 6,
      otpExpiryMinutes: 10,
      otpMaxAttempts: 3,
      reminder1Day: 1,
      reminder2Day: 2,
      reminderFinalDay: 3,
      expiryDay: 7,
      gamificationEnabled: true,
      tier1Label: "T1L",
      tier1Description: "T1D",
      tier2Label: "T2L",
      tier2Description: "T2D",
      autoProcessA: true,
      manualProcessB: false,
      alertCd: false,
      auditRetentionDays: 365,
      exportFormat: "csv",
      staleHours: 72,
      updatedAt: "2026-06-01T00:00:00.000Z",
    };

    it("maps an hours config", () => {
      const out = mapPlatformConfig(cfg);
      expect(out.tokenUnit).toBe("hours");
      expect(out.tokenHours).toBe(24);
      expect(out.tokenMinutes).toBe(60);
      expect(out.tier1Title).toBe("T1L");
    });

    it("maps a minutes config", () => {
      const out = mapPlatformConfig({ ...cfg, tokenExpiryUnit: "minutes", tokenExpiryValue: 30 });
      expect(out.tokenUnit).toBe("minutes");
      expect(out.tokenMinutes).toBe(30);
      expect(out.tokenHours).toBe(24);
    });

    it("falls back to default tier labels and descriptions when missing", () => {
      const out = mapPlatformConfig({ ...cfg, tier1Label: null, tier1Description: null, tier2Label: null, tier2Description: null });
      expect(out.tier1Title).toBe("Cedar Rose Insights Access");
      expect(out.tier2Desc).toBe("");
    });
  });

  describe("mapPlatformConfigToApi", () => {
    it("returns the inverse shape for hours", () => {
      const out = mapPlatformConfigToApi({
        linkValidity: 2,
        tokenType: "JWT",
        tokenUnit: "hours",
        tokenHours: 24,
        tokenMinutes: 60,
        otpExpiry: 10,
        otpRetry: 3,
        lockoutDuration: 15,
        otpResend: 3,
        r1: 1,
        r2: 2,
        r3: 3,
        expiry: 7,
        gamification: true,
        midPrompt: true,
        midText: "x",
        nearPrompt: true,
        nearText: "y",
        rewardSystem: true,
        tier1Title: "T1T",
        tier1Desc: "T1D",
        tier1Accel: true,
        tier1Discount: true,
        tier1Active: true,
        tier2Title: "T2T",
        tier2Desc: "T2D",
        tier2Active: true,
        autoA: true,
        manualB: false,
        alertCD: false,
        auditRetention: 365,
        exportFormat: "csv",
        staleHours: 72,
      });
      expect(out.tokenExpiryValue).toBe(24);
      expect(out.tokenExpiryUnit).toBe("hours");
      expect(out.tier1Label).toBe("T1T");
    });

    it("returns the inverse shape for minutes", () => {
      const out = mapPlatformConfigToApi({
        linkValidity: 2,
        tokenType: "JWT",
        tokenUnit: "minutes",
        tokenHours: 24,
        tokenMinutes: 30,
        otpExpiry: 10,
        otpRetry: 3,
        lockoutDuration: 15,
        otpResend: 3,
        r1: 1,
        r2: 2,
        r3: 3,
        expiry: 7,
        gamification: true,
        midPrompt: true,
        midText: "x",
        nearPrompt: true,
        nearText: "y",
        rewardSystem: true,
        tier1Title: "T1T",
        tier1Desc: "T1D",
        tier1Accel: true,
        tier1Discount: true,
        tier1Active: true,
        tier2Title: "T2T",
        tier2Desc: "T2D",
        tier2Active: true,
        autoA: true,
        manualB: false,
        alertCD: false,
        auditRetention: 365,
        exportFormat: "csv",
        staleHours: 72,
      });
      expect(out.tokenExpiryValue).toBe(30);
    });
  });

  describe("mapTemplate / mapTemplateToApi", () => {
    const apiTpl: ApiTemplate = {
      templateId: "t1",
      name: "Tpl",
      recipientType: "Supplier",
      status: "Active",
      updatedAt: "2026-06-01T00:00:00.000Z",
      updatedBy: "u1",
      editorName: "Editor",
      totalQuestions: 4,
      sections: [
        {
          sectionId: "s-1",
          title: "Section 1",
          description: "Desc",
          banner: "Banner",
          orderIndex: 0,
          questions: [
            {
              questionId: "q-1",
              label: "Q1",
              fieldType: "text",
              mandatory: true,
              prefill: false,
              orderIndex: 0,
              options: ["a", "b"],
            },
            {
              questionId: "q-2",
              label: "Q2",
              fieldType: "support_doc" as never,
              mandatory: false,
              prefill: true,
              orderIndex: 1,
            },
          ],
        },
      ],
    };

    it("maps a template", () => {
      const t = mapTemplate(apiTpl);
      expect(t.id).toBe("t1");
      expect(t.editor).toBe("Editor");
      expect(t.sections[0].questions[0].text).toBe("Q1");
      expect(t.sections[0].questions[0].options).toEqual(["a", "b"]);
    });

    it("uses an override editor when provided", () => {
      const t = mapTemplate(apiTpl, "Override");
      expect(t.editor).toBe("Override");
    });

    it("falls back to em-dash when editorName is missing", () => {
      const t = mapTemplate({ ...apiTpl, editorName: undefined });
      expect(t.editor).toBe("—");
    });

    it("uses an empty section list when sections is missing", () => {
      const t = mapTemplate({ ...apiTpl, sections: undefined });
      expect(t.sections).toEqual([]);
    });

    it("sorts sections by orderIndex", () => {
      const t = mapTemplate({
        ...apiTpl,
        sections: [
          { title: "B", orderIndex: 1, questions: [{ label: "Q", fieldType: "text", mandatory: true, prefill: false, orderIndex: 0 }] },
          { title: "A", orderIndex: 0, questions: [{ label: "Q", fieldType: "text", mandatory: true, prefill: false, orderIndex: 0 }] },
        ],
      });
      expect(t.sections[0].title).toBe("A");
      expect(t.sections[1].title).toBe("B");
    });

    it("falls back to default label and prefill when missing", () => {
      const t = mapTemplate({
        ...apiTpl,
        sections: [
          {
            title: "S",
            orderIndex: 0,
            questions: [
              {
                // label undefined, prefill undefined
                fieldType: "text",
                mandatory: false,
                orderIndex: 0,
              } as never,
            ],
          },
        ],
      });
      expect(t.sections[0].questions[0].text).toBe("");
      expect(t.sections[0].questions[0].prefill).toBe(false);
    });

    it("generates default question and section ids when missing", () => {
      const t = mapTemplate({
        ...apiTpl,
        sections: [
          {
            title: "S",
            orderIndex: 0,
            questions: [
              { label: "Q", fieldType: "text", mandatory: true, prefill: false, orderIndex: 0 },
            ],
          },
        ],
      });
      expect(t.sections[0].id).toBe("s-0");
      expect(t.sections[0].questions[0].id).toBe("q-0");
    });

    it("maps table columns for table field type", () => {
      const t = mapTemplate({
        ...apiTpl,
        sections: [
          {
            title: "S",
            orderIndex: 0,
            questions: [
              {
                label: "Q",
                fieldType: "table",
                mandatory: false,
                prefill: false,
                orderIndex: 0,
                tableColumns: [
                  { name: "col1", type: "text" as never, required: true },
                  { name: "fallback-name", type: "support_doc" as never, required: false },
                  { name: "k", type: "text" as never, required: false },
                ],
              },
            ],
          },
        ],
      });
      const cols = t.sections[0].questions[0].columns!;
      expect(cols).toHaveLength(3);
      expect(cols[0]).toMatchObject({ name: "col1", type: "text", required: true });
      expect(cols[1]).toMatchObject({ name: "fallback-name", type: "file", required: false });
      expect(cols[2]).toMatchObject({ name: "k", type: "text" });
    });

    it("omits columns when the column list is empty", () => {
      const t = mapTemplate({
        ...apiTpl,
        sections: [
          {
            title: "S",
            orderIndex: 0,
            questions: [{ label: "Q", fieldType: "table", mandatory: false, prefill: false, orderIndex: 0, tableColumns: [] }],
          },
        ],
      });
      expect(t.sections[0].questions[0].columns).toBeUndefined();
    });

    it("falls back through label, key, and the literal 'Column' for missing column names", () => {
      const t = mapTemplate({
        ...apiTpl,
        sections: [
          {
            title: "S",
            orderIndex: 0,
            questions: [
              {
                label: "Q",
                fieldType: "table",
                mandatory: false,
                prefill: false,
                orderIndex: 0,
                tableColumns: [
                  { type: "text" as never, required: false } as never, // no name/label/key
                ],
              },
            ],
          },
        ],
      });
      expect(t.sections[0].questions[0].columns![0].name).toBe("Column");
      expect(t.sections[0].questions[0].columns![0].type).toBe("text");
      expect(t.sections[0].questions[0].columns![0].required).toBe(false);
    });

    it("maps table columns with partial fields (label only, missing type/required)", () => {
      const t = mapTemplate({
        ...apiTpl,
        sections: [
          {
            title: "S",
            orderIndex: 0,
            questions: [
              {
                label: "Q",
                fieldType: "table",
                mandatory: false,
                prefill: false,
                orderIndex: 0,
                tableColumns: [
                  { name: "col" } as never, // type/required missing
                ],
              },
            ],
          },
        ],
      });
      expect(t.sections[0].questions[0].columns![0].name).toBe("col");
      expect(t.sections[0].questions[0].columns![0].type).toBe("text");
      expect(t.sections[0].questions[0].columns![0].required).toBe(false);
    });

    it("round-trips a template through mapTemplateToApi / mapTemplate", () => {
      const original = mapTemplate(apiTpl);
      const roundTripped = mapTemplate(mapTemplateToApi(original) as unknown as ApiTemplate);
      expect(roundTripped.name).toBe("Tpl");
      expect(roundTripped.sections[0].questions[0].text).toBe("Q1");
    });
  });

  describe("mapQuestionnaireFormData", () => {
    it("maps form data and filters invalid saved responses", () => {
      const out = mapQuestionnaireFormData({
        case: {
          caseId: "c1",
          subjectName: "Acme",
          recipientType: "Supplier",
          status: "SENT",
          currentStep: 2,
        },
        template: {
          templateId: "t1",
          name: "Tpl",
          recipientType: "Supplier",
          status: "Active",
          updatedAt: "2026-06-01T00:00:00.000Z",
          sections: [],
        },
        savedResponses: [
          { questionId: "q1", sectionId: "s1", question: "Q?", answer: "A", mandatory: true },
          { questionId: null, sectionId: "s1", question: "Q2", answer: "B" },
          { questionId: "q3", sectionId: null, question: "Q3", answer: "C" },
          { questionId: "q4", sectionId: "s4", question: "Q4" },
        ],
      });
      expect(out.case.currentStep).toBe(2);
      expect(out.savedResponses).toHaveLength(2);
    });

    it("defaults currentStep to 1", () => {
      const out = mapQuestionnaireFormData({
        case: { caseId: "c1", subjectName: "Acme", recipientType: "Supplier", status: "SENT" },
        template: {
          templateId: "t1",
          name: "Tpl",
          recipientType: "Supplier",
          status: "Active",
          updatedAt: "2026-06-01T00:00:00.000Z",
          sections: [],
        },
      });
      expect(out.case.currentStep).toBe(1);
      expect(out.savedResponses).toBeUndefined();
    });
  });
});
