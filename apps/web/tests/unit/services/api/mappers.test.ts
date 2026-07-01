import { describe, it, expect } from "vitest";
import {
  toRoleKey,
  toApiRole,
  mapCurrentUser,
  mapCase,
  mapCompany,
  mapUser,
  mapAuditEvent,
  mapNotification,
  mapNotificationPreferences,
  mapPlatformConfig,
  mapPlatformConfigToApi,
  mapTemplate,
  mapTemplateToApi,
  mapQuestionnaireFormData,
  splitName,
  isLocalUserId,
  isLocalTemplateId,
} from "@/services/api/mappers";

describe("api mappers", () => {
  it("maps role casing", () => {
    expect(toRoleKey("Analyst")).toBe("analyst");
    expect(toApiRole("admin")).toBe("Admin");
  });

  it("maps current user and admin users", () => {
    const user = mapCurrentUser({
      userId: "u1",
      email: "a@b.com",
      firstName: "Ada",
      lastName: "Lovelace",
      role: "Analyst",
      status: "Active",
    });
    expect(user).toMatchObject({ id: "u1", role: "analyst", initials: "AL" });

    const mappedUser = mapUser({
      userId: "u2",
      email: "b@b.com",
      firstName: "Bob",
      lastName: "Smith",
      role: "Researcher",
      status: "Pending",
      score: "88",
      totalReports: 10,
      lastSubmission: "2026-01-01T00:00:00.000Z",
    });
    expect(mappedUser.status).toBe("Pending");
    expect(mappedUser.score).toBe(88);
  });

  it("maps inactive users and invalid scores", () => {
    const inactive = mapUser({
      userId: "u3",
      email: "c@b.com",
      firstName: "C",
      lastName: "D",
      role: "Admin",
      status: "Disabled",
      score: "not-a-number",
    });
    expect(inactive.status).toBe("Inactive");
    expect(inactive.score).toBeNull();
  });

  it("maps case with company uid and researcher decision", () => {
    const mapped = mapCase({
      caseId: "c1",
      caseRef: "CR-1",
      orderId: "ORD-1",
      subjectName: "Acme",
      country: "AE",
      recipientType: "Supplier",
      status: "SENT",
      completionMandatory: 50,
      completionOptional: 10,
      dateReceived: "2026-01-01T00:00:00.000Z",
      currentStep: 1,
      researcherStatus: "Approved",
      company: {
        companyName: "Acme LLC",
        crisNumber: "CR-55",
        country: "AE",
        riskRating: "Low",
        recipientEmails: ["a@b.com"],
      },
      responses: [{ question: "Name", answer: "Acme", mandatory: true }],
    });
    expect(mapped.uid).toBe("CR-55");
    expect(mapped.companyData.companyName).toBe("Acme LLC");
    expect(mapped.researcherDecision).toBe("Approved");
    expect(mapped.responses).toHaveLength(1);
  });

  it("maps case without company using subject fallback", () => {
    const mapped = mapCase({
      caseId: "c2",
      caseRef: "CR-2",
      orderId: "ORD-2",
      subjectName: "Fallback Co",
      country: "AE",
      recipientType: "Customer",
      status: "NOT SENT",
      completionMandatory: 0,
      completionOptional: 0,
      dateReceived: "2026-01-01T00:00:00.000Z",
      currentStep: 1,
    });
    expect(mapped.companyData.companyName).toBe("Fallback Co");
  });

  it("maps company recipient emails from objects", () => {
    expect(
      mapCompany({
        companyId: "1",
        companyName: "Acme",
        crisNumber: "CR-1",
        country: "AE",
        riskRating: "Low",
        recipientEmails: [{ email: "a@b.com" } as unknown as string],
      }).recipientEmails,
    ).toEqual(["a@b.com"]);
  });

  it("maps notification preferences with API defaults", () => {
    expect(
      mapNotificationPreferences({
        userId: "u-1",
        email: "a@b.com",
        firstName: "A",
        lastName: "B",
        role: "Analyst",
        status: "Active",
      }),
    ).toEqual({
      notifyOnSubmission: true,
      notifyOnLinkExpiry: true,
      notifyOnBlockedDispatch: true,
      notifyOnRemindersSent: true,
    });

    expect(
      mapNotificationPreferences({
        userId: "u-2",
        email: "a@b.com",
        firstName: "A",
        lastName: "B",
        role: "Analyst",
        status: "Active",
        notifyOnSubmission: false,
        notifyOnLinkExpiry: false,
        notifyOnBlockedDispatch: false,
        notifyOnRemindersSent: false,
      }),
    ).toEqual({
      notifyOnSubmission: false,
      notifyOnLinkExpiry: false,
      notifyOnBlockedDispatch: false,
      notifyOnRemindersSent: false,
    });
  });

  it("maps audit, notification, and platform config", () => {
    const audit = mapAuditEvent({
      auditId: "a1",
      eventType: "API Call",
      description: "Created",
      status: "Success",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(audit.id).toBe("a1");

    const notification = mapNotification({
      notificationId: "n1",
      userId: "u1",
      type: "stale",
      title: "Stale case",
      body: "Body",
      read: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(notification.type).toBe("stale");

    const config = mapPlatformConfig({
      configId: "cfg",
      linkValidityDays: 10,
      tokenType: "single-use",
      tokenExpiryValue: 60,
      tokenExpiryUnit: "minutes",
      otpLength: 6,
      otpExpiryMinutes: 10,
      otpMaxAttempts: 3,
      reminder1Day: 3,
      reminder2Day: 5,
      reminderFinalDay: 7,
      expiryDay: 10,
      gamificationEnabled: true,
      tier1Label: "T1",
      tier1Description: "Desc1",
      tier2Label: "T2",
      tier2Description: "Desc2",
      autoProcessA: true,
      manualProcessB: false,
      alertCd: true,
      auditRetentionDays: 365,
      exportFormat: "csv",
      staleHours: 72,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(config.tokenMinutes).toBe(60);
    const apiConfig = mapPlatformConfigToApi(config);
    expect(apiConfig.linkValidityDays).toBe(10);
    expect(apiConfig.tokenExpiryUnit).toBe("minutes");
  });

  it("maps templates with sections, questions, and table columns", () => {
    const template = mapTemplate({
      templateId: "tpl-1",
      name: "Standard",
      recipientType: "Supplier",
      status: "Active",
      updatedAt: "2026-01-01T00:00:00.000Z",
      editorName: "Tester",
      sections: [
        {
          sectionId: "s1",
          title: "Section",
          banner: "Banner",
          orderIndex: 1,
          questions: [
            {
              questionId: "q1",
              label: "Shareholders",
              fieldType: "table",
              mandatory: true,
              orderIndex: 0,
              tableColumns: [{ name: "Name", type: "text", required: true }],
              condition: { enabled: true, fieldId: "q0", operator: "equals", value: "yes" },
            },
          ],
        },
        {
          title: "Second",
          orderIndex: 0,
          questions: [],
        },
      ],
    });
    expect(template.id).toBe("tpl-1");
    expect(template.sections.find((s) => s.banner === "Banner")?.questions[0].columns?.[0].name).toBe("Name");

    const apiTemplate = mapTemplateToApi({
      id: "tpl-1",
      name: "Standard",
      recipientType: "Supplier",
      status: "Active",
      lastEdited: "today",
      editor: "Tester",
      sections: [
        {
          id: "s1",
          number: 1,
          title: "Section",
          description: "Desc",
          questions: [
            {
              id: "q1",
              text: "Name",
              type: "text",
              required: true,
              prefill: false,
              systemControlled: true,
              repeater: true,
              attachUpload: true,
              sameAsToggleLabel: "Same as above",
              note: "Note",
              helpText: "Help",
              validation: { maxLength: 100 },
              condition: { enabled: true, fieldId: "q0", operator: "equals", value: "yes" },
              options: ["A"],
              columns: [{ name: "Col", type: "text", required: false }],
            },
          ],
        },
      ],
    });
    expect(apiTemplate.sections).toHaveLength(1);
    expect(apiTemplate.sections[0].questions[0].tableColumns).toHaveLength(1);
  });

  it("maps questionnaire form data and filters invalid saved responses", () => {
    const data = mapQuestionnaireFormData({
      case: {
        caseId: "c1",
        subjectName: "Acme",
        recipientType: "Supplier",
        status: "IN PROGRESS",
      },
      template: {
        templateId: "tpl-1",
        name: "T",
        recipientType: "Supplier",
        status: "Active",
        updatedAt: "2026-01-01T00:00:00.000Z",
        sections: [],
      },
      savedResponses: [
        {
          questionId: "q1",
          sectionId: "s1",
          question: "Q",
          answer: "A",
          mandatory: true,
        },
        {
          questionId: null,
          sectionId: "s1",
          question: "Skip",
          answer: "",
        },
      ],
    });
    expect(data.savedResponses).toHaveLength(1);
    expect(data.case.currentStep).toBe(1);
  });

  it("maps splitName and local id helpers", () => {
    expect(splitName("Ada Lovelace")).toEqual({ firstName: "Ada", lastName: "Lovelace" });
    expect(splitName("Solo")).toEqual({ firstName: "Solo", lastName: "" });
    expect(splitName("  ")).toEqual({ firstName: "", lastName: "" });
    expect(isLocalUserId("USR-abc")).toBe(true);
    expect(isLocalUserId("00000000-0000-0000-0000-000000000001")).toBe(false);
    expect(isLocalTemplateId("tpl-1")).toBe(true);
    expect(isLocalTemplateId("00000000-0000-0000-0000-000000000002")).toBe(false);
  });

  it("maps user with platforms and inactive status", () => {
    const user = mapUser({
      userId: "u-1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@test.com",
      role: "Analyst",
      status: "Inactive",
      platforms: [{ platform: "QA Questionnaire Platform" }],
    } as Parameters<typeof mapUser>[0]);
    expect(user.platforms).toEqual(["QA Questionnaire Platform"]);
    expect(user.status).toBe("Inactive");
  });

  it("sorts template section questions by orderIndex", () => {
    const template = mapTemplate({
      templateId: "tpl-2",
      name: "Sorted",
      recipientType: "Supplier",
      status: "Active",
      updatedAt: "2026-01-01T00:00:00.000Z",
      sections: [
        {
          sectionId: "s1",
          title: "Section",
          orderIndex: 0,
          questions: [
            { questionId: "q2", label: "Second", fieldType: "text", orderIndex: 2, mandatory: true },
            { questionId: "q1", label: "First", fieldType: "text", orderIndex: 1, mandatory: true },
          ],
        },
      ],
    });
    expect(template.sections[0].questions[0].text).toBe("First");
  });

  it("uses 'file' type for support_doc field type", () => {
    const template = mapTemplate({
      templateId: "tpl-3",
      name: "DocUpload",
      recipientType: "Supplier",
      status: "Active",
      updatedAt: "2026-01-01T00:00:00.000Z",
      sections: [
        {
          sectionId: "s1",
          title: "Section",
          orderIndex: 0,
          questions: [
            {
              questionId: "q1",
              label: "Upload",
              fieldType: "file",
              orderIndex: 0,
              mandatory: false,
            },
          ],
        },
      ],
    });
    expect(template.sections[0].questions[0].type).toBe("file");
  });

  it("falls back to '—' for template editor when missing", () => {
    const template = mapTemplate({
      templateId: "tpl-4",
      name: "NoEditor",
      recipientType: "Supplier",
      status: "Active",
      updatedAt: "2026-01-01T00:00:00.000Z",
      sections: [],
    });
    expect(template.editor).toBe("—");
  });

  it("uses editor parameter over API editorName", () => {
    const template = mapTemplate(
      {
        templateId: "tpl-5",
        name: "WithEditor",
        recipientType: "Supplier",
        status: "Active",
        updatedAt: "2026-01-01T00:00:00.000Z",
        editorName: "FromApi",
        sections: [],
      },
      "Local Editor",
    );
    expect(template.editor).toBe("Local Editor");
  });

  it("maps user with initials fallback when missing", () => {
    const user = mapCurrentUser({
      userId: "u-1",
      email: "a@b.com",
      firstName: "Ada",
      lastName: "Lovelace",
      role: "Analyst",
      status: "Active",
    });
    expect(user.initials).toBe("AL");
  });

  it("uses role as title when title is missing", () => {
    const user = mapCurrentUser({
      userId: "u-3",
      email: "a@b.com",
      firstName: "X",
      lastName: "Y",
      role: "Admin",
      status: "Active",
    });
    expect(user.title).toBe("Admin");
  });

  it("maps user with string score that is not finite", () => {
    const user = mapUser({
      userId: "u-4",
      email: "a@b.com",
      firstName: "X",
      lastName: "Y",
      role: "Analyst",
      status: "Active",
      score: "not-a-number",
    } as Parameters<typeof mapUser>[0]);
    expect(user.score).toBeNull();
  });

  it("maps case with company missing recipient emails", () => {
    const mapped = mapCase({
      caseId: "c-no-emails",
      caseRef: "CR-1",
      orderId: "ORD-1",
      subjectName: "Acme",
      country: "AE",
      recipientType: "Supplier",
      status: "SENT",
      completionMandatory: 0,
      completionOptional: 0,
      dateReceived: "2026-01-01T00:00:00.000Z",
      currentStep: 1,
      company: {
        companyName: "Acme LLC",
        crisNumber: "CR-55",
        country: null,
        riskRating: null,
        recipientEmails: [],
      } as unknown as Parameters<typeof mapCase>[0]["company"],
    } as Parameters<typeof mapCase>[0]);
    expect(mapped.companyData.country).toBe("");
    expect(mapped.companyData.riskRating).toBe("Low");
  });

  it("maps full platform config to API shape", () => {
    const config: Parameters<typeof mapPlatformConfigToApi>[0] = {
      linkValidity: 10,
      tokenType: "single-use",
      tokenUnit: "hours",
      tokenHours: 24,
      tokenMinutes: 60,
      otpExpiry: 10,
      otpRetry: 3,
      lockoutDuration: 15,
      otpResend: 3,
      r1: 3,
      r2: 5,
      r3: 7,
      expiry: 10,
      gamification: true,
      midPrompt: true,
      midText: "Halfway",
      nearPrompt: true,
      nearText: "Almost",
      rewardSystem: true,
      tier1Title: "T1",
      tier1Desc: "D1",
      tier1Accel: false,
      tier1Discount: false,
      tier1Active: true,
      tier2Title: "T2",
      tier2Desc: "D2",
      tier2Active: true,
      autoA: true,
      manualB: false,
      alertCD: true,
      auditRetention: 365,
      exportFormat: "csv",
      staleHours: 72,
    };
    const result = mapPlatformConfigToApi(config);
    expect(result.tokenExpiryValue).toBe(24);
    expect(result.tokenExpiryUnit).toBe("hours");
  });

  it("maps full platform config to API shape with minutes", () => {
    const config: Parameters<typeof mapPlatformConfigToApi>[0] = {
      linkValidity: 10,
      tokenType: "single-use",
      tokenUnit: "minutes",
      tokenHours: 24,
      tokenMinutes: 60,
      otpExpiry: 10,
      otpRetry: 3,
      lockoutDuration: 15,
      otpResend: 3,
      r1: 3,
      r2: 5,
      r3: 7,
      expiry: 10,
      gamification: true,
      midPrompt: true,
      midText: "Halfway",
      nearPrompt: true,
      nearText: "Almost",
      rewardSystem: true,
      tier1Title: "T1",
      tier1Desc: "D1",
      tier1Accel: false,
      tier1Discount: false,
      tier1Active: true,
      tier2Title: "T2",
      tier2Desc: "D2",
      tier2Active: true,
      autoA: true,
      manualB: false,
      alertCD: true,
      auditRetention: 365,
      exportFormat: "csv",
      staleHours: 72,
    };
    const result = mapPlatformConfigToApi(config);
    expect(result.tokenExpiryValue).toBe(60);
  });

  it("returns no columns when tableColumns is missing or empty", () => {
    const template = mapTemplate({
      templateId: "tpl-no-cols",
      name: "NoCols",
      recipientType: "Supplier",
      status: "Active",
      updatedAt: "2026-01-01T00:00:00.000Z",
      sections: [
        {
          sectionId: "s1",
          title: "Section",
          orderIndex: 0,
          questions: [
            { questionId: "q1", label: "NoTable", fieldType: "text", orderIndex: 0, mandatory: false },
          ],
        },
      ],
    });
    expect(template.sections[0].questions[0].columns).toBeUndefined();
  });

  it("maps notification without caseId", () => {
    const notification = mapNotification({
      notificationId: "n-1",
      userId: "u-1",
      type: "submission",
      title: "T",
      body: "B",
      read: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(notification.caseId).toBeUndefined();
  });

  it("maps questionnaire responses with default answer and mandatory", () => {
    const data = mapQuestionnaireFormData({
      case: {
        caseId: "c1",
        subjectName: "Acme",
        recipientType: "Supplier",
        status: "IN PROGRESS",
      },
      template: {
        templateId: "tpl-1",
        name: "T",
        recipientType: "Supplier",
        status: "Active",
        updatedAt: "2026-01-01T00:00:00.000Z",
        sections: [],
      },
      savedResponses: [
        { questionId: "q1", sectionId: "s1", question: "Q" },
      ],
    });
    expect(data.savedResponses?.[0]?.answer).toBe("");
    expect(data.savedResponses?.[0]?.mandatory).toBe(false);
  });
});
