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

  it("maps audit, notification, and platform config", () => {
    const audit = mapAuditEvent({
      auditId: "a1",
      eventType: "CASE_CREATED",
      description: "Created",
      status: "SUCCESS",
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
              tableColumns: [{ label: "Name", type: "text", required: true }],
              condition: { questionId: "q0", operator: "equals", value: "yes" },
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
              systemControlled: true,
              repeater: true,
              attachUpload: true,
              sameAsToggleLabel: "Same as above",
              note: "Note",
              helpText: "Help",
              validation: { maxLength: 100 },
              condition: { questionId: "q0", operator: "equals", value: "yes" },
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
});
