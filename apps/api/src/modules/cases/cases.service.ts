import type { CasesRepository } from "./cases.repository.js";
import { determineInitialStatus, generateSecureLink } from "./cases.repository.js";
import type { CompaniesRepository } from "../companies/companies.repository.js";
import type { TemplatesRepository } from "../templates/templates.repository.js";
import type { AuditService } from "../audit/audit.service.js";
import type { NotificationsService } from "../notifications/notifications.service.js";
import type { EmailService } from "../../lib/email-service.js";
import { detectEmailTypo } from "../../shared/utils/email.js";
import { AppError } from "../../shared/errors/AppError.js";
import { env } from "../../config/env.js";
import { safeExternalFetch } from "../../shared/utils/http-client.js";
import { WORKFLOW_STEP } from "../../config/workflow.js";

export class CasesService {
  constructor(
    private readonly casesRepo: CasesRepository,
    private readonly companiesRepo: CompaniesRepository,
    private readonly templatesRepo: TemplatesRepository,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService
  ) {}

  async list(filters: Parameters<CasesRepository["findAll"]>[0]) {
    return this.casesRepo.findAll(filters);
  }

  async getById(caseId: string) {
    const c = await this.casesRepo.findById(caseId);
    if (!c) throw new AppError(404, "CASE_NOT_FOUND", `Case not found`);
    const responses = await this.casesRepo.getResponses(caseId);
    return { ...c, responses };
  }

  async createCase(
    dto: {
      orderId: string;
      uid?: string;
      subjectName: string;
      country: string;
      recipientType: string;
      recipientEmail?: string;
      linkValidityHours?: number;
      templateId?: string;
      analystId?: string;
    },
    requesterId: string
  ) {
    if (dto.recipientEmail && detectEmailTypo(dto.recipientEmail)) {
      throw new AppError(400, "EMAIL_TYPO_DETECTED", "Possible email typo detected");
    }

    let companyId: string | undefined;
    let subjectName = dto.subjectName;
    if (dto.uid) {
      const company = await this.companiesRepo.findByCrisNumber(dto.uid);
      if (company) {
        companyId = company.companyId;
        subjectName = company.companyName;
      }
    }

    let templateId = dto.templateId;
    if (!templateId) {
      const template = await this.templatesRepo.findActiveByRecipientType(dto.recipientType);
      templateId = template?.templateId;
    }

    if (dto.recipientEmail && !templateId) {
      throw new AppError(
        400,
        "TEMPLATE_NOT_AVAILABLE",
        `No active questionnaire template is available for recipient type "${dto.recipientType}". Add and activate a template in Form Builder before sending.`
      );
    }

    const status = determineInitialStatus(!!dto.recipientEmail, !!dto.uid);
    const caseRef = await this.casesRepo.getNextCaseRef();
    const validityHours = dto.linkValidityHours ?? 48;

    let linkData: ReturnType<typeof generateSecureLink> | undefined;
    if (dto.recipientEmail && status === "NOT SENT") {
      linkData = generateSecureLink(validityHours);
    }

    const created = await this.casesRepo.create({
      caseRef,
      orderId: dto.orderId,
      companyId,
      subjectName,
      country: dto.country,
      recipientType: dto.recipientType,
      status: linkData ? "SENT" : status,
      analystId: dto.analystId ?? requesterId,
      templateId,
      linkValidityHours: validityHours,
      linkTokenHash: linkData?.tokenHash,
      linkExpiry: linkData?.expiresAt,
      dateDispatched: linkData ? new Date() : undefined,
      researcherStatus: "Not Applicable",
    });

    await this.auditService.log({
      caseId: created.caseId,
      caseSubject: created.subjectName,
      caseOrderId: created.orderId,
      step: WORKFLOW_STEP.ORDER_RECEIVED,
      eventType: "API Call",
      description: "Order received",
      triggeredByUserId: requesterId,
      status: "Success",
    });

    if (companyId) {
      await this.auditService.log({
        caseId: created.caseId,
        step: WORKFLOW_STEP.FETCH_COMPANY_DATA,
        eventType: "API Call",
        description: "Company data fetched from CRiS",
        triggeredByUserId: requesterId,
        status: "Success",
      });
    }

    if (templateId) {
      await this.auditService.log({
        caseId: created.caseId,
        step: WORKFLOW_STEP.APPLY_TEMPLATE,
        eventType: "API Call",
        description: "Questionnaire template applied",
        triggeredByUserId: requesterId,
        status: "Success",
      });
    }

    let linkUrl: string | null = null;
    if (linkData) {
      await this.auditService.log({
        caseId: created.caseId,
        step: WORKFLOW_STEP.GENERATE_LINK,
        eventType: "Link Event",
        description: "Secure link generated",
        triggeredByUserId: requesterId,
        status: "Success",
      });

      linkUrl = `${env.frontendUrl}/q/${linkData.rawToken}`;
      if (dto.recipientEmail) {
        await this.emailService.sendQuestionnaireLink(dto.recipientEmail, subjectName, linkUrl);
        await this.auditService.log({
          caseId: created.caseId,
          step: WORKFLOW_STEP.SEND_LINK,
          eventType: "Link Event",
          description: "Secure link sent",
          triggeredByUserId: requesterId,
          status: "Success",
        });
      }
    }

    const caseRecord = (await this.casesRepo.findById(created.caseId)) ?? created;
    // Return linkUrl once in the creation response so admin UI can display/copy it.
    // The raw token is never stored in the DB — this is the only time it is returned.
    return { ...caseRecord, linkUrl };
  }

  async resendLink(caseId: string, requesterId: string, requesterRole: string) {
    const c = await this.casesRepo.findById(caseId);
    if (!c) throw new AppError(404, "CASE_NOT_FOUND", "Case not found");
    if (requesterRole !== "Admin" && c.analystId !== requesterId) {
      throw new AppError(403, "FORBIDDEN", "Not allowed to resend link for this case");
    }

    const recipientEmail = c.company?.recipientEmails?.[0];
    if (!recipientEmail) {
      throw new AppError(400, "VALIDATION_ERROR", "No recipient email on file for this case");
    }

    const linkData = generateSecureLink(c.linkValidityHours ?? 48);
    const linkUrl = `${env.frontendUrl}/q/${linkData.rawToken}`;
    const updated = await this.casesRepo.update(caseId, {
      linkTokenHash: linkData.tokenHash,
      linkExpiry: linkData.expiresAt,
      status: "SENT",
      dateDispatched: new Date(),
      remindersSent: 0,
      resentCount: (c.resentCount ?? 0) + 1,
    });

    await this.auditService.log({
      caseId,
      step: WORKFLOW_STEP.GENERATE_LINK,
      eventType: "Link Event",
      description: "Secure link generated",
      triggeredByUserId: requesterId,
      status: "Success",
    });

    await this.emailService.sendQuestionnaireLink(recipientEmail, c.subjectName, linkUrl);

    await this.auditService.log({
      caseId,
      step: WORKFLOW_STEP.SEND_LINK,
      eventType: "Link Event",
      description: "Link resent",
      triggeredByUserId: requesterId,
      status: "Success",
    });

    return { ...updated, linkUrl };
  }

  async apiPush(caseId: string) {
    const c = await this.casesRepo.findById(caseId);
    if (!c) throw new AppError(404, "CASE_NOT_FOUND", "Case not found");

    try {
      if (env.allowedExternalHosts.length) {
        await safeExternalFetch(`https://${env.allowedExternalHosts[0]}/api/push`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId, orderId: c.orderId }),
        });
      }

      const updated = await this.casesRepo.update(caseId, {
        apiPushStatus: "Success",
        apiPushAt: new Date(),
      });

      await this.auditService.log({
        caseId,
        step: WORKFLOW_STEP.API_PUSH,
        eventType: "API Push",
        description: "API push succeeded",
        status: "Success",
      });

      return updated;
    } catch {
      await this.casesRepo.update(caseId, { apiPushStatus: "Failed" });
      throw new AppError(500, "INTERNAL_SERVER_ERROR", "API push failed");
    }
  }

  async exportAll() {
    const { data } = await this.casesRepo.findAll({ offset: 0, limit: 10000 });
    return data;
  }
}
