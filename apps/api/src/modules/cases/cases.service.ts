import type { CasesRepository } from "./cases.repository.js";
import { determineInitialStatus, generateSecureLink } from "./cases.repository.js";
import type { CompanyRequestsRepository } from "../company-requests/company-requests.repository.js";
import type { TemplatesRepository } from "../templates/templates.repository.js";
import type { AuditService } from "../audit/audit.service.js";
import type { EmailService } from "../../lib/email-service.js";
import { detectEmailTypo } from "../../shared/utils/email.js";
import { AppError } from "../../shared/errors/AppError.js";
import { env } from "../../config/env.js";
import { safeExternalFetch } from "../../shared/utils/http-client.js";
import { WORKFLOW_STEP } from "../../config/workflow.js";

export class CasesService {
  constructor(
    private readonly casesRepo: CasesRepository,
    private readonly companyRequestsRepo: CompanyRequestsRepository,
    private readonly templatesRepo: TemplatesRepository,
    private readonly auditService: AuditService,
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
      companyRequestId?: string;
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

    const company = dto.companyRequestId
      ? await this.resolveCompanyRequest(dto.companyRequestId)
      : undefined;

    const subjectName = company?.subjectName ?? dto.subjectName;
    const country = company?.country ?? dto.country;
    const companyRequestId = company?.companyRequestId;
    const recipientEmails = company?.recipientEmails;
    const recipientEmail = dto.recipientEmail || recipientEmails?.[0];

    const templateId = await this.resolveTemplateId(dto.templateId, dto.recipientType);

    if (dto.recipientEmail && !templateId) {
      throw new AppError(
        400,
        "TEMPLATE_NOT_AVAILABLE",
        `No active questionnaire template is available for recipient type "${dto.recipientType}". Add and activate a template in Form Builder before sending.`
      );
    }

    const status = determineInitialStatus(!!dto.recipientEmail, !!dto.companyRequestId);
    const caseRef = await this.casesRepo.getNextCaseRef();
    const validityHours = dto.linkValidityHours ?? 48;

    const linkData =
      dto.recipientEmail && status === "NOT SENT" ? generateSecureLink(validityHours) : undefined;

    const created = await this.casesRepo.create({
      caseRef,
      orderId: dto.orderId,
      subjectName,
      country,
      recipientType: dto.recipientType,
      status: linkData ? "SENT" : status,
      analystId: dto.analystId ?? requesterId,
      templateId,
      linkValidityHours: validityHours,
      linkTokenHash: linkData?.tokenHash,
      linkExpiry: linkData?.expiresAt,
      dateDispatched: linkData ? new Date() : undefined,
      researcherStatus: "Not Applicable",
      externalRef: company?.externalRef,
      riskRating: company?.riskRating,
      incorporationDate: company?.incorporationDate,
      legalStructure: company?.legalStructure,
      primaryIndustry: company?.primaryIndustry,
      recipientEmails,
      companyRequestId,
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

    if (companyRequestId) {
      await this.companyRequestsRepo.markConsumed(companyRequestId, created.caseId);

      await this.auditService.log({
        caseId: created.caseId,
        step: WORKFLOW_STEP.FETCH_COMPANY_DATA,
        eventType: "API Call",
        description: "Company data loaded from webhook request",
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

    const linkUrl = await this.dispatchLink(
      created.caseId,
      linkData,
      recipientEmail,
      subjectName,
      requesterId
    );

    const caseRecord = (await this.casesRepo.findById(created.caseId)) ?? created;
    return { ...caseRecord, linkUrl };
  }

  private async resolveCompanyRequest(companyRequestId: string) {
    const cr = await this.companyRequestsRepo.findById(companyRequestId);
    if (!cr) throw new AppError(404, "NOT_FOUND", `Company request ${companyRequestId} not found`);
    if (cr.status !== "Pending")
      throw new AppError(409, "COMPANY_REQUEST_ALREADY_USED", "Company request has already been used");

    return {
      subjectName: cr.companyName,
      country: cr.country,
      companyRequestId: cr.companyRequestId,
      externalRef: cr.externalRef,
      riskRating: cr.riskRating ?? undefined,
      incorporationDate: cr.incorporationDate ?? undefined,
      legalStructure: cr.legalStructure ?? undefined,
      primaryIndustry: cr.primaryIndustry ?? undefined,
      recipientEmails: cr.recipientEmails ?? [],
    };
  }

  private async resolveTemplateId(
    templateId: string | undefined,
    recipientType: string
  ): Promise<string | undefined> {
    if (templateId) return templateId;
    const template = await this.templatesRepo.findActiveByRecipientType(recipientType);
    return template?.templateId;
  }

  private async dispatchLink(
    caseId: string,
    linkData: ReturnType<typeof generateSecureLink> | undefined,
    recipientEmail: string | undefined,
    subjectName: string,
    requesterId: string
  ): Promise<string | null> {
    if (!linkData) return null;

    await this.auditService.log({
      caseId,
      step: WORKFLOW_STEP.GENERATE_LINK,
      eventType: "Link Event",
      description: "Secure link generated",
      triggeredByUserId: requesterId,
      status: "Success",
    });

    const linkUrl = `${env.frontendUrl}/q/${linkData.rawToken}`;

    if (!recipientEmail) return linkUrl;

    await this.emailService.sendQuestionnaireLink(recipientEmail, subjectName, linkUrl);
    await this.auditService.log({
      caseId,
      step: WORKFLOW_STEP.SEND_LINK,
      eventType: "Link Event",
      description: "Secure link sent",
      triggeredByUserId: requesterId,
      status: "Success",
    });

    return linkUrl;
  }

  async resendLink(caseId: string, requesterId: string, requesterRole: string) {
    const c = await this.casesRepo.findById(caseId);
    if (!c) throw new AppError(404, "CASE_NOT_FOUND", "Case not found");
    if (requesterRole !== "Admin" && c.analystId !== requesterId) {
      throw new AppError(403, "FORBIDDEN", "Not allowed to resend link for this case");
    }

    const recipientEmail = c.recipientEmails?.[0];
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

  async exportAll(filters: Parameters<CasesRepository["findAll"]>[0]) {
    const { data } = await this.casesRepo.findAll({ ...filters, offset: 0, limit: 10000 });
    return data;
  }

  exportBatches(filters: Omit<Parameters<CasesRepository["findAll"]>[0], "offset" | "limit">) {
    return this.casesRepo.exportBatches(filters);
  }
}
