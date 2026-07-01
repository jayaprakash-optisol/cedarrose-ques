import { describe, it, expect, beforeEach, vi } from "vitest";
import jwt from "jsonwebtoken";
import { QuestionnaireService } from "../../../../src/modules/questionnaire/questionnaire.service.js";
import type { CasesRepository } from "../../../../src/modules/cases/cases.repository.js";
import type { TemplatesRepository } from "../../../../src/modules/templates/templates.repository.js";
import type { QuestionnaireRepository } from "../../../../src/modules/questionnaire/questionnaire.repository.js";
import { WORKFLOW_STEP } from "../../../../src/config/workflow.js";
import { env } from "../../../../src/config/env.js";
import { hashToken } from "../../../../src/shared/utils/crypto.js";
import {
  createMockCasesRepository,
  createMockTemplatesRepository,
  createMockQuestionnaireRepository,
} from "../../../helpers/mock-repositories.js";
import { createMockAuditService, createMockNotificationsService } from "../../../helpers/mock-services.js";
import { createMockEmailService } from "../../../helpers/mock-email-service.js";
import { createMockCase } from "../../../helpers/mock-case.js";
import { generateSecureLink } from "../../../../src/modules/cases/cases.repository.js";

function caseWithRecipient(overrides: Record<string, unknown> = {}) {
  return {
    ...createMockCase({ recipientType: "Supplier", status: "SENT" }),
    analystName: "Test Analyst",
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
    ...overrides,
  };
}

describe("QuestionnaireService", () => {
  let casesRepo: ReturnType<typeof createMockCasesRepository>;
  let templatesRepo: ReturnType<typeof createMockTemplatesRepository>;
  let questionnaireRepo: ReturnType<typeof createMockQuestionnaireRepository>;
  let auditService: ReturnType<typeof createMockAuditService>;
  let notificationsService: ReturnType<typeof createMockNotificationsService>;
  let emailService: ReturnType<typeof createMockEmailService>;
  let service: QuestionnaireService;

  let rawToken: string;

  beforeEach(() => {
    casesRepo = createMockCasesRepository();
    templatesRepo = createMockTemplatesRepository();
    questionnaireRepo = createMockQuestionnaireRepository();
    auditService = createMockAuditService();
    notificationsService = createMockNotificationsService();
    emailService = createMockEmailService();
    service = new QuestionnaireService(
      casesRepo as unknown as CasesRepository,
      templatesRepo as unknown as TemplatesRepository,
      questionnaireRepo as unknown as QuestionnaireRepository,
      auditService,
      notificationsService,
      emailService,
    );
    rawToken = generateSecureLink(48).rawToken;
  });

  function mockActiveLink(c: ReturnType<typeof caseWithRecipient>) {
    vi.mocked(casesRepo.findByLinkTokenHash).mockResolvedValue(c);
    vi.mocked(casesRepo.isLinkExpired).mockResolvedValue(false);
  }

  describe("verifyLink", () => {
    it("rejects invalid or expired links", async () => {
      vi.mocked(casesRepo.findByLinkTokenHash).mockResolvedValue(null);
      await expect(service.verifyLink("bad-token")).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid or expired link",
      });
    });

    it("marks expired cases and rejects the link", async () => {
      const c = caseWithRecipient({ status: "IN PROGRESS" });
      vi.mocked(casesRepo.findByLinkTokenHash).mockResolvedValue(c);
      vi.mocked(casesRepo.isLinkExpired).mockResolvedValue(true);

      await expect(service.verifyLink(rawToken)).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid or expired link",
      });
      expect(casesRepo.update).toHaveBeenCalledWith(c.caseId, { status: "EXPIRED" });
    });

    it("records first open and returns masked email", async () => {
      const c = caseWithRecipient({ firstOpenedAt: null });
      mockActiveLink(c);
      vi.mocked(casesRepo.findById).mockResolvedValue(c);

      const result = await service.verifyLink(rawToken);

      expect(casesRepo.update).toHaveBeenCalledWith(
        c.caseId,
        expect.objectContaining({ firstOpenedAt: expect.any(Date) }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ step: WORKFLOW_STEP.RECIPIENT_OPENS_LINK }),
      );
      expect(result.maskedEmail).toBe("r***@test.com");
      expect(result.recipientType).toBe("Supplier");
    });

    it("throws when no recipient email on file", async () => {
      const c = caseWithRecipient({ company: null });
      mockActiveLink(c);
      vi.mocked(casesRepo.findById).mockResolvedValue(c);

      await expect(service.verifyLink(rawToken)).rejects.toMatchObject({
        message: "No recipient email on file for this case",
      });
    });
  });

  describe("requestOtp", () => {
    it("stores hashed otp and sends email", async () => {
      const c = caseWithRecipient();
      mockActiveLink(c);
      vi.mocked(casesRepo.findById).mockResolvedValue(c);

      await service.requestOtp(rawToken);

      expect(questionnaireRepo.setOtp).toHaveBeenCalledWith(
        c.caseId,
        expect.any(String),
        expect.any(Date),
      );
      expect(emailService.sendOtpEmail).toHaveBeenCalledWith("recipient@test.com", expect.any(String));
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ step: WORKFLOW_STEP.AUTHENTICATION, description: "OTP requested" }),
      );
    });
  });

  describe("verifyOtp", () => {
    it("rejects expired otp", async () => {
      const c = caseWithRecipient();
      mockActiveLink(c);
      vi.mocked(questionnaireRepo.getOtp).mockResolvedValue({
        hash: "h",
        expiresAt: new Date(Date.now() - 1000),
        attempts: 0,
      });

      await expect(service.verifyOtp(rawToken, "123456")).rejects.toMatchObject({
        message: "OTP expired",
      });
    });

    it("rejects too many attempts", async () => {
      const c = caseWithRecipient();
      mockActiveLink(c);
      vi.mocked(questionnaireRepo.getOtp).mockResolvedValue({
        hash: "h",
        expiresAt: new Date(Date.now() + 60000),
        attempts: 3,
      });

      await expect(service.verifyOtp(rawToken, "123456")).rejects.toMatchObject({
        statusCode: 429,
        message: "Too many OTP attempts",
      });
    });

    it("increments attempts on invalid otp", async () => {
      const c = caseWithRecipient();
      mockActiveLink(c);
      vi.mocked(questionnaireRepo.getOtp).mockResolvedValue({
        hash: hashToken("999999"),
        expiresAt: new Date(Date.now() + 60000),
        attempts: 1,
      });

      await expect(service.verifyOtp(rawToken, "123456")).rejects.toMatchObject({
        message: "Invalid OTP",
      });
      expect(questionnaireRepo.incrementOtpAttempts).toHaveBeenCalledWith(c.caseId);
    });

    it("returns session token on valid otp", async () => {
      const c = caseWithRecipient();
      const otp = "654321";
      mockActiveLink(c);
      vi.mocked(questionnaireRepo.getOtp).mockResolvedValue({
        hash: hashToken(otp),
        expiresAt: new Date(Date.now() + 60000),
        attempts: 0,
      });

      const result = await service.verifyOtp(rawToken, otp);

      expect(questionnaireRepo.clearOtp).toHaveBeenCalledWith(c.caseId);
      expect(result.caseId).toBe(c.caseId);
      const decoded = jwt.verify(result.sessionToken, env.jwtQuestionnairePublicKey) as {
        caseId: string;
        sub: string;
      };
      expect(decoded.caseId).toBe(c.caseId);
      expect(decoded.sub).toBe(rawToken);
    });
  });

  describe("getForm", () => {
    it("requires bearer session", async () => {
      await expect(service.getForm(undefined)).rejects.toMatchObject({
        statusCode: 401,
        message: "Questionnaire session required",
      });
    });

    it("returns SESSION_EXPIRED when jwt has expired", async () => {
      const c = caseWithRecipient();
      const token = jwt.sign(
        { sub: rawToken, caseId: c.caseId },
        env.jwtQuestionnairePrivateKey,
        { algorithm: env.jwtAlgorithm, expiresIn: -1 },
      );

      await expect(service.getForm(`Bearer ${token}`)).rejects.toMatchObject({
        statusCode: 401,
        code: "SESSION_EXPIRED",
        message: "Your session has expired. Please open the questionnaire link from your email again.",
      });
    });

    it("throws when case has no template", async () => {
      const c = caseWithRecipient({ templateId: null });
      const token = jwt.sign({ sub: rawToken, caseId: c.caseId }, env.jwtQuestionnairePrivateKey, { algorithm: env.jwtAlgorithm });
      vi.mocked(casesRepo.findById).mockResolvedValue(c);

      await expect(service.getForm(`Bearer ${token}`)).rejects.toMatchObject({
        message: "No template assigned",
      });
    });

    it("loads template, advances status, and returns form payload", async () => {
      const c = caseWithRecipient({ status: "SENT", templateId: "tpl-1" });
      const token = jwt.sign({ sub: rawToken, caseId: c.caseId }, env.jwtQuestionnairePrivateKey, { algorithm: env.jwtAlgorithm });
      const template = { templateId: "tpl-1", sections: [] };
      const responses = [{ mandatory: true, answer: "Yes" }];
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      vi.mocked(templatesRepo.getFullTemplate).mockResolvedValue(template as never);
      vi.mocked(questionnaireRepo.getResponses).mockResolvedValue(responses as never);

      const result = await service.getForm(`Bearer ${token}`);

      expect(casesRepo.update).toHaveBeenCalledWith(
        c.caseId,
        expect.objectContaining({ status: "IN PROGRESS" }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ step: WORKFLOW_STEP.BEGIN_QUESTIONNAIRE }),
      );
      expect(result.template).toEqual(template);
      expect(result.savedResponses).toEqual(responses);
    });
  });

  describe("saveProgress", () => {
    it("upserts responses and updates completion", async () => {
      const c = caseWithRecipient({ templateId: "tpl-1" });
      const token = jwt.sign({ sub: rawToken, caseId: c.caseId }, env.jwtQuestionnairePrivateKey, { algorithm: env.jwtAlgorithm });
      const responses = [
        { mandatory: true, answer: "A" },
        { mandatory: true, answer: "" },
      ];
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      vi.mocked(questionnaireRepo.getResponses).mockResolvedValue(responses as never);

      await service.saveProgress(`Bearer ${token}`, responses as never);

      expect(questionnaireRepo.upsertResponses).toHaveBeenCalledWith(c.caseId, responses);
      expect(casesRepo.update).toHaveBeenCalledWith(
        c.caseId,
        expect.objectContaining({ completionMandatory: 50, lastActivity: expect.any(Date) }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ step: WORKFLOW_STEP.SAVE_PROGRESS }),
      );
    });
  });

  describe("submit", () => {
    it("marks completed with missing data when mandatory answers incomplete", async () => {
      const c = caseWithRecipient({
        templateId: "tpl-1",
        analystId: "11111111-1111-1111-1111-111111111111",
      });
      const token = jwt.sign({ sub: rawToken, caseId: c.caseId }, env.jwtQuestionnairePrivateKey, { algorithm: env.jwtAlgorithm });
      const responses = [
        { mandatory: true, answer: "" },
        { mandatory: false, answer: "opt" },
      ];
      const updated = { ...c, status: "COMPLETED — MISSING DATA" };
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      vi.mocked(questionnaireRepo.getResponses).mockResolvedValue(responses as never);
      vi.mocked(casesRepo.update).mockResolvedValue(updated);

      const result = await service.submit(`Bearer ${token}`);

      expect(result.status).toBe("COMPLETED — MISSING DATA");
      expect(notificationsService.notifySubmission).toHaveBeenCalledWith(
        c.caseId,
        c.analystId,
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ step: WORKFLOW_STEP.SUBMIT }),
      );
    });

    it("marks fully completed when all mandatory answers present", async () => {
      const c = caseWithRecipient({ templateId: "tpl-1", analystId: null });
      const token = jwt.sign({ sub: rawToken, caseId: c.caseId }, env.jwtQuestionnairePrivateKey, { algorithm: env.jwtAlgorithm });
      const responses = [{ mandatory: true, answer: "done" }];
      const updated = { ...c, status: "COMPLETED" };
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      vi.mocked(questionnaireRepo.getResponses).mockResolvedValue(responses as never);
      vi.mocked(casesRepo.update).mockResolvedValue(updated);

      const result = await service.submit(`Bearer ${token}`);

      expect(result.status).toBe("COMPLETED");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ step: WORKFLOW_STEP.MANDATORY_COMPLETE }),
      );
      expect(notificationsService.notifySubmission).not.toHaveBeenCalled();
    });
  });
});
