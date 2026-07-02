import { describe, it, expect, beforeEach, vi } from "vitest";
import { CasesService } from "../../../../src/modules/cases/cases.service.js";
import type { CasesRepository } from "../../../../src/modules/cases/cases.repository.js";
import type { CompanyRequestsRepository } from "../../../../src/modules/company-requests/company-requests.repository.js";
import type { TemplatesRepository } from "../../../../src/modules/templates/templates.repository.js";
import { WORKFLOW_STEP } from "../../../../src/config/workflow.js";
import { env } from "../../../../src/config/env.js";
import * as httpClient from "../../../../src/shared/utils/http-client.js";
import {
  createMockCasesRepository,
  createMockCompanyRequestsRepository,
  createMockTemplatesRepository,
} from "../../../helpers/mock-repositories.js";
import { createMockAuditService } from "../../../helpers/mock-services.js";
import { createMockEmailService } from "../../../helpers/mock-email-service.js";
import { createMockCase } from "../../../helpers/mock-case.js";

function createMockCompanyRequest() {
  return {
    companyRequestId: "55000000-5555-5555-5555-555555555555",
    orderId: "ORD-2001",
    externalRef: "CRIS-1001",
    companyName: "Acme Ltd",
    country: "GB",
    riskRating: "Low",
    incorporationDate: null,
    legalStructure: null,
    primaryIndustry: null,
    recipientType: null,
    recipientEmails: ["acme@test.com"],
    rawPayload: {},
    status: "Pending",
    receivedAt: new Date(),
    consumedAt: null,
    caseId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("CasesService", () => {
  let casesRepo: ReturnType<typeof createMockCasesRepository>;
  let companyRequestsRepo: ReturnType<typeof createMockCompanyRequestsRepository>;
  let templatesRepo: ReturnType<typeof createMockTemplatesRepository>;
  let auditService: ReturnType<typeof createMockAuditService>;
  let emailService: ReturnType<typeof createMockEmailService>;
  let service: CasesService;

  const requesterId = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    casesRepo = createMockCasesRepository();
    companyRequestsRepo = createMockCompanyRequestsRepository();
    templatesRepo = createMockTemplatesRepository();
    auditService = createMockAuditService();
    emailService = createMockEmailService();
    service = new CasesService(
      casesRepo as unknown as CasesRepository,
      companyRequestsRepo as unknown as CompanyRequestsRepository,
      templatesRepo as unknown as TemplatesRepository,
      auditService,
      emailService,
    );
  });

  describe("list", () => {
    it("delegates to repository", async () => {
      const payload = { data: [createMockCase()], total: 1 };
      vi.mocked(casesRepo.findAll).mockResolvedValue(payload);
      await expect(service.list({ offset: 0, limit: 10 })).resolves.toEqual(payload);
    });
  });

  describe("getById", () => {
    it("throws when case is missing", async () => {
      vi.mocked(casesRepo.findById).mockResolvedValue(null);
      await expect(service.getById("missing")).rejects.toMatchObject({
        statusCode: 404,
        code: "CASE_NOT_FOUND",
      });
    });

    it("returns case with responses", async () => {
      const c = createMockCase();
      const responses = [{ responseId: "r1" }];
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      vi.mocked(casesRepo.getResponses).mockResolvedValue(responses as never);

      await expect(service.getById(c.caseId)).resolves.toEqual({ ...c, responses });
    });
  });

  describe("createCase", () => {
    const baseDto = {
      orderId: "ORD-2001",
      subjectName: "Subject Co",
      country: "GB",
      recipientType: "Supplier",
    };

    it("rejects emails with likely typos", async () => {
      await expect(
        service.createCase({ ...baseDto, recipientEmail: "user@gmial.com" }, requesterId),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "EMAIL_TYPO_DETECTED",
      });
    });

    it("creates pending linkage case without companyRequestId or email", async () => {
      const created = createMockCase({ status: "PENDING LINKAGE & CONTACT" });
      vi.mocked(casesRepo.getNextCaseRef).mockResolvedValue("c-002");
      vi.mocked(casesRepo.create).mockResolvedValue(created);
      vi.mocked(casesRepo.findById).mockResolvedValue(created);

      const result = await service.createCase(baseDto, requesterId);

      expect(casesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "PENDING LINKAGE & CONTACT",
          linkTokenHash: undefined,
        }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ step: WORKFLOW_STEP.ORDER_RECEIVED }),
      );
      expect(result.linkUrl).toBeNull();
    });

    it("resolves company from companyRequestId and logs fetch step", async () => {
      const cr = createMockCompanyRequest();
      const created = createMockCase({
        companyRequestId: cr.companyRequestId,
        externalRef: cr.externalRef,
        subjectName: cr.companyName,
        recipientEmails: cr.recipientEmails,
        status: "PENDING CONTACT",
      });
      vi.mocked(companyRequestsRepo.findById).mockResolvedValue(cr);
      vi.mocked(casesRepo.getNextCaseRef).mockResolvedValue("c-003");
      vi.mocked(casesRepo.create).mockResolvedValue(created);
      vi.mocked(casesRepo.findById).mockResolvedValue(created);

      await service.createCase({ ...baseDto, companyRequestId: cr.companyRequestId }, requesterId);

      expect(casesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyRequestId: cr.companyRequestId,
          externalRef: cr.externalRef,
          subjectName: cr.companyName,
          status: "PENDING CONTACT",
        }),
      );
      expect(companyRequestsRepo.markConsumed).toHaveBeenCalledWith(
        cr.companyRequestId,
        created.caseId,
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ step: WORKFLOW_STEP.FETCH_COMPANY_DATA }),
      );
    });

    it("rejects already-used company request", async () => {
      const cr = { ...createMockCompanyRequest(), status: "Used" };
      vi.mocked(companyRequestsRepo.findById).mockResolvedValue(cr);

      await expect(
        service.createCase({ ...baseDto, companyRequestId: cr.companyRequestId }, requesterId),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: "COMPANY_REQUEST_ALREADY_USED",
      });
    });

    it("applies active template for recipient type when templateId omitted", async () => {
      const template = {
        templateId: "33333333-3333-3333-3333-333333333333",
        name: "Supplier",
        status: "Active",
        recipientType: "Supplier",
        version: 1,
        createdBy: requesterId,
        updatedBy: requesterId,
        description: null,
        lastEditedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const created = createMockCase({ templateId: template.templateId });
      vi.mocked(templatesRepo.findActiveByRecipientType).mockResolvedValue(template);
      vi.mocked(casesRepo.getNextCaseRef).mockResolvedValue("c-004");
      vi.mocked(casesRepo.create).mockResolvedValue(created);
      vi.mocked(casesRepo.findById).mockResolvedValue(created);

      await service.createCase(baseDto, requesterId);

      expect(templatesRepo.findActiveByRecipientType).toHaveBeenCalledWith("Supplier");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ step: WORKFLOW_STEP.APPLY_TEMPLATE }),
      );
    });

    it("generates link, sends email, and returns linkUrl when recipient email provided", async () => {
      const template = {
        templateId: "33333333-3333-3333-3333-333333333333",
        name: "Supplier",
        status: "Active",
        recipientType: "Supplier",
        version: 1,
        createdBy: requesterId,
        updatedBy: requesterId,
        description: null,
        lastEditedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const created = createMockCase({ status: "SENT", templateId: template.templateId });
      vi.mocked(templatesRepo.findActiveByRecipientType).mockResolvedValue(template);
      vi.mocked(casesRepo.getNextCaseRef).mockResolvedValue("c-005");
      vi.mocked(casesRepo.create).mockResolvedValue(created);
      vi.mocked(casesRepo.findById).mockResolvedValue(created);

      const result = await service.createCase(
        { ...baseDto, recipientEmail: "recipient@test.com" },
        requesterId,
      );

      expect(casesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "SENT",
          templateId: template.templateId,
          linkTokenHash: expect.any(String),
          linkExpiry: expect.any(Date),
          dateDispatched: expect.any(Date),
        }),
      );
      expect(emailService.sendQuestionnaireLink).toHaveBeenCalledOnce();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ step: WORKFLOW_STEP.GENERATE_LINK }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ step: WORKFLOW_STEP.SEND_LINK }),
      );
      expect(result.linkUrl).toMatch(new RegExp(`^${env.frontendUrl}/q/`));
    });

    it("rejects send when no active template exists for recipient type", async () => {
      vi.mocked(templatesRepo.findActiveByRecipientType).mockResolvedValue(null);

      await expect(
        service.createCase({ ...baseDto, recipientEmail: "recipient@test.com" }, requesterId),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "TEMPLATE_NOT_AVAILABLE",
      });

      expect(casesRepo.create).not.toHaveBeenCalled();
      expect(emailService.sendQuestionnaireLink).not.toHaveBeenCalled();
    });
  });

  describe("resendLink", () => {
    it("throws when case is not found", async () => {
      vi.mocked(casesRepo.findById).mockResolvedValue(null);
      await expect(service.resendLink("missing", requesterId, "Analyst")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("forbids non-admin analysts from resending others' cases", async () => {
      vi.mocked(casesRepo.findById).mockResolvedValue(
        createMockCase({ analystId: "other-analyst" }),
      );
      await expect(service.resendLink("case", requesterId, "Analyst")).rejects.toMatchObject({
        statusCode: 403,
        code: "FORBIDDEN",
      });
    });

    it("rejects resend when no recipient email is on file", async () => {
      vi.mocked(casesRepo.findById).mockResolvedValue({
        ...createMockCase({ resentCount: 1 }),
        analystName: "Test",
        company: null,
        stepTimestamps: {},
      });
      await expect(service.resendLink("case", "other-admin", "Admin")).rejects.toMatchObject({
        statusCode: 400,
        message: "No recipient email on file for this case",
      });
    });

    it("allows admin to resend, emails recipient, and returns link URL", async () => {
      const existing = {
        ...createMockCase({ resentCount: 1, recipientEmails: ["recipient@test.com"] }),
        analystName: "Test",
        company: {
          companyName: "Acme Ltd",
          crisNumber: "CRIS-1001",
          country: "GB",
          riskRating: "Low",
          incorporationDate: null,
          legalStructure: null,
          primaryIndustry: null,
          recipientEmails: ["recipient@test.com"],
        },
        stepTimestamps: {},
      };
      const updated = createMockCase({ status: "SENT", resentCount: 2 });
      vi.mocked(casesRepo.findById).mockResolvedValue(existing);
      vi.mocked(casesRepo.update).mockResolvedValue(updated);

      const result = await service.resendLink(existing.caseId, "other-admin", "Admin");

      expect(casesRepo.update).toHaveBeenCalledWith(
        existing.caseId,
        expect.objectContaining({
          status: "SENT",
          remindersSent: 0,
          resentCount: 2,
        }),
      );
      expect(emailService.sendQuestionnaireLink).toHaveBeenCalledWith(
        "recipient@test.com",
        existing.subjectName,
        expect.stringMatching(new RegExp(`^${env.frontendUrl}/q/`)),
      );
      expect(result.linkUrl).toMatch(new RegExp(`^${env.frontendUrl}/q/`));
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Link resent" }),
      );
    });
  });

  describe("apiPush", () => {
    beforeEach(() => {
      vi.spyOn(httpClient, "safeExternalFetch").mockResolvedValue(new Response());
    });

    it("marks push success when no external hosts configured", async () => {
      const c = createMockCase();
      const updated = { ...c, apiPushStatus: "Success" as const };
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      vi.mocked(casesRepo.update).mockResolvedValue(updated);

      const result = await service.apiPush(c.caseId);

      expect(result.apiPushStatus).toBe("Success");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ step: WORKFLOW_STEP.API_PUSH }),
      );
    });

    it("skips external fetch and marks success when allowedExternalHosts is empty", async () => {
      const c = createMockCase();
      const updated = { ...c, apiPushStatus: "Success" as const };
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      vi.mocked(casesRepo.update).mockResolvedValue(updated);

      const savedHosts = env.allowedExternalHosts.splice(0);
      vi.mocked(httpClient.safeExternalFetch).mockClear();

      try {
        const result = await service.apiPush(c.caseId);

        expect(httpClient.safeExternalFetch).not.toHaveBeenCalled();
        expect(result.apiPushStatus).toBe("Success");
        expect(casesRepo.update).toHaveBeenCalledWith(
          c.caseId,
          expect.objectContaining({ apiPushStatus: "Success" }),
        );
      } finally {
        env.allowedExternalHosts.push(...savedHosts);
      }
    });

    it("marks push failed and throws on external error", async () => {
      const c = createMockCase();
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      const hosts = env.allowedExternalHosts;
      Object.defineProperty(env, "allowedExternalHosts", {
        configurable: true,
        value: ["api.example.com"],
      });
      vi.mocked(httpClient.safeExternalFetch).mockRejectedValue(new Error("network"));

      await expect(service.apiPush(c.caseId)).rejects.toMatchObject({
        statusCode: 500,
        message: "API push failed",
      });
      expect(casesRepo.update).toHaveBeenCalledWith(c.caseId, { apiPushStatus: "Failed" });

      Object.defineProperty(env, "allowedExternalHosts", { configurable: true, value: hosts });
    });
  });

  describe("exportAll", () => {
    it("returns all cases up to limit", async () => {
      const rows = [createMockCase()];
      vi.mocked(casesRepo.findAll).mockResolvedValue({ data: rows, total: 1 });
      await expect(service.exportAll()).resolves.toEqual(rows);
    });
  });
});
