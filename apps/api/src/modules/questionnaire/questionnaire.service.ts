import jwt from "jsonwebtoken";
import type { CasesRepository } from "../cases/cases.repository.js";
import type { TemplatesRepository } from "../templates/templates.repository.js";
import type { AuditService } from "../audit/audit.service.js";
import type { NotificationsService } from "../notifications/notifications.service.js";
import type { EmailService } from "../../lib/email-service.js";
import type { QuestionnaireRepository } from "./questionnaire.repository.js";
import { hashToken, generateOtp } from "../../shared/utils/crypto.js";
import { env } from "../../config/env.js";
import { QUESTIONNAIRE_TOKEN_EXPIRY } from "../../config/constants.js";
import { WORKFLOW_STEP } from "../../config/workflow.js";
import { AppError } from "../../shared/errors/AppError.js";

export class QuestionnaireService {
  constructor(
    private readonly casesRepo: CasesRepository,
    private readonly templatesRepo: TemplatesRepository,
    private readonly questionnaireRepo: QuestionnaireRepository,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService
  ) {}

  private maskEmail(email: string): string {
    const atIdx = email.indexOf("@");
    if (atIdx <= 0) return email;
    const local = email.slice(0, atIdx);
    const domain = email.slice(atIdx + 1);
    return `${local[0]}***@${domain}`;
  }

  private computeCompletionPercentages(
    responses: Array<{ mandatory: boolean; answer?: string | null }>,
  ) {
    const mandatory = responses.filter((r) => r.mandatory);
    const optional = responses.filter((r) => !r.mandatory);
    const pct = (list: typeof responses) =>
      list.length
        ? Math.round((list.filter((r) => r.answer?.trim()).length / list.length) * 100)
        : 0;
    return {
      completionMandatory: pct(mandatory),
      completionOptional: pct(optional),
    };
  }

  private async getPrimaryRecipientEmail(caseId: string): Promise<string> {
    const fullCase = await this.casesRepo.findById(caseId);
    const email = fullCase?.company?.recipientEmails?.[0];
    if (!email) {
      throw new AppError(400, "VALIDATION_ERROR", "No recipient email on file for this case");
    }
    return email;
  }

  async verifyLink(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const c = await this.casesRepo.findByLinkHash(tokenHash);
    if (!c) throw new AppError(400, "VALIDATION_ERROR", "Invalid or expired link");

    if (!c.firstOpenedAt) {
      await this.casesRepo.update(c.caseId, { firstOpenedAt: new Date() });
    }

    await this.auditService.log({
      caseId: c.caseId,
      step: WORKFLOW_STEP.RECIPIENT_OPENS_LINK,
      eventType: "Link Event",
      description: "Link verified",
      status: "Success",
    });

    const primaryEmail = await this.getPrimaryRecipientEmail(c.caseId);

    return {
      caseId: c.caseId,
      subjectName: c.subjectName,
      recipientType: c.recipientType,
      status: c.status,
      maskedEmail: this.maskEmail(primaryEmail),
    };
  }

  async requestOtp(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const c = await this.casesRepo.findByLinkHash(tokenHash);
    if (!c) throw new AppError(400, "VALIDATION_ERROR", "Invalid or expired link");

    const recipientEmail = await this.getPrimaryRecipientEmail(c.caseId);
    const otp = generateOtp(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.questionnaireRepo.setOtp(c.caseId, hashToken(otp), expiresAt);
    await this.emailService.sendOtpEmail(recipientEmail, otp);

    await this.auditService.log({
      caseId: c.caseId,
      step: WORKFLOW_STEP.AUTHENTICATION,
      eventType: "Authentication",
      description: "OTP requested",
      status: "Success",
    });
  }

  async verifyOtp(rawToken: string, otp: string) {
    const tokenHash = hashToken(rawToken);
    const c = await this.casesRepo.findByLinkHash(tokenHash);
    if (!c) throw new AppError(400, "VALIDATION_ERROR", "Invalid or expired link");

    const entry = await this.questionnaireRepo.getOtp(c.caseId);
    if (!entry || new Date() > entry.expiresAt) {
      throw new AppError(400, "VALIDATION_ERROR", "OTP expired");
    }
    if (entry.attempts >= 3) {
      throw new AppError(429, "VALIDATION_ERROR", "Too many OTP attempts");
    }

    if (entry.hash !== hashToken(otp)) {
      await this.questionnaireRepo.incrementOtpAttempts(c.caseId);
      throw new AppError(400, "VALIDATION_ERROR", "Invalid OTP");
    }

    await this.questionnaireRepo.clearOtp(c.caseId);

    const sessionToken = jwt.sign(
      { sub: rawToken, caseId: c.caseId },
      env.questionnaireJwtSecret,
      { expiresIn: QUESTIONNAIRE_TOKEN_EXPIRY }
    );

    await this.auditService.log({
      caseId: c.caseId,
      step: WORKFLOW_STEP.AUTHENTICATION,
      eventType: "Authentication",
      description: "OTP verified",
      status: "Success",
    });

    return { sessionToken, caseId: c.caseId };
  }

  private async getCaseFromSession(authHeader?: string) {
    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError(401, "UNAUTHORIZED", "Questionnaire session required");
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.questionnaireJwtSecret) as { caseId: string; sub: string };
    const c = await this.casesRepo.findById(decoded.caseId);
    if (!c) throw new AppError(404, "CASE_NOT_FOUND", "Case not found");
    return c;
  }

  async getForm(authHeader?: string) {
    const c = await this.getCaseFromSession(authHeader);
    if (!c.templateId) throw new AppError(404, "NOT_FOUND", "No template assigned");

    if (c.status === "SENT") {
      await this.casesRepo.update(c.caseId, {
        status: "OPENED",
        lastActivity: new Date(),
        firstOpenedAt: c.firstOpenedAt ?? new Date(),
      });
    }
    if (c.status === "OPENED" || c.status === "SENT") {
      await this.casesRepo.update(c.caseId, {
        status: "IN PROGRESS",
        lastActivity: new Date(),
        firstOpenedAt: c.firstOpenedAt ?? new Date(),
      });
    }

    const template = await this.templatesRepo.getFullTemplate(c.templateId);
    if (!template) throw new AppError(404, "NOT_FOUND", "Template not found");

    const savedResponses = await this.questionnaireRepo.getResponses(c.caseId);

    if (savedResponses.length) {
      const completion = this.computeCompletionPercentages(savedResponses);
      await this.casesRepo.update(c.caseId, completion);
    }

    await this.auditService.log({
      caseId: c.caseId,
      step: WORKFLOW_STEP.BEGIN_QUESTIONNAIRE,
      eventType: "Form Activity",
      description: "Form loaded",
      status: "Success",
    });

    return {
      case: {
        caseId: c.caseId,
        subjectName: c.subjectName,
        recipientType: c.recipientType,
        status: c.status,
        currentStep: c.currentStep,
      },
      template,
      savedResponses,
    };
  }

  async saveProgress(authHeader: string | undefined, responses: Parameters<QuestionnaireRepository["upsertResponses"]>[1]) {
    const c = await this.getCaseFromSession(authHeader);
    await this.questionnaireRepo.upsertResponses(c.caseId, responses);
    const allResponses = await this.questionnaireRepo.getResponses(c.caseId);
    const completion = this.computeCompletionPercentages(allResponses);
    await this.casesRepo.update(c.caseId, { lastActivity: new Date(), ...completion });

    await this.auditService.log({
      caseId: c.caseId,
      step: WORKFLOW_STEP.SAVE_PROGRESS,
      eventType: "Form Activity",
      description: "Progress saved",
      status: "Success",
    });
  }

  async submit(authHeader: string | undefined) {
    const c = await this.getCaseFromSession(authHeader);
    const responses = await this.questionnaireRepo.getResponses(c.caseId);
    const mandatory = responses.filter((r) => r.mandatory);
    const allMandatoryFilled = mandatory.every((r) => r.answer?.trim());
    const status = allMandatoryFilled ? "COMPLETED" : "COMPLETED — MISSING DATA";

    const mandatoryPct = mandatory.length
      ? Math.round((mandatory.filter((r) => r.answer?.trim()).length / mandatory.length) * 100)
      : 100;
    const optional = responses.filter((r) => !r.mandatory);
    const optionalPct = optional.length
      ? Math.round((optional.filter((r) => r.answer?.trim()).length / optional.length) * 100)
      : 0;

    const updated = await this.casesRepo.update(c.caseId, {
      status,
      dateSubmitted: new Date(),
      completionMandatory: mandatoryPct,
      completionOptional: optionalPct,
      researcherStatus: "Awaiting Review",
      lastActivity: new Date(),
    });

    if (allMandatoryFilled) {
      await this.auditService.log({
        caseId: c.caseId,
        step: WORKFLOW_STEP.MANDATORY_COMPLETE,
        eventType: "Form Activity",
        description: "Mandatory fields complete",
        status: "Success",
      });
    }

    await this.auditService.log({
      caseId: c.caseId,
      step: WORKFLOW_STEP.SUBMIT,
      eventType: "Form Activity",
      description: "Questionnaire submitted",
      status: "Success",
    });

    await this.auditService.log({
      caseId: c.caseId,
      step: WORKFLOW_STEP.SUBMISSION_RECEIVED,
      eventType: "Form Activity",
      description: "Submission received",
      status: "Success",
    });

    if (c.analystId) {
      await this.notificationsService.notifySubmission(c.caseId, c.analystId);
    }

    return updated;
  }
}
