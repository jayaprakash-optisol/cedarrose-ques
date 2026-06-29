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
    if (dto.uid) {
      const company = await this.companiesRepo.findByCrisNumber(dto.uid);
      if (company) companyId = company.companyId;
    }

    let templateId = dto.templateId;
    if (!templateId) {
      const template = await this.templatesRepo.findActiveByRecipientType(dto.recipientType);
      templateId = template?.templateId;
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
      subjectName: dto.subjectName,
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
      step: 1,
      eventType: "API Call",
      description: "Case created",
      triggeredByUserId: requesterId,
      status: "Success",
    });

    let linkUrl: string | null = null;
    if (linkData) {
      linkUrl = `${env.frontendUrl}/q/${linkData.rawToken}`;
      if (dto.recipientEmail) {
        await this.emailService.sendQuestionnaireLink(dto.recipientEmail, dto.subjectName, linkUrl);
        await this.auditService.log({
          caseId: created.caseId,
          step: 5,
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

    const linkData = generateSecureLink(c.linkValidityHours ?? 48);
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
      step: 5,
      eventType: "Link Event",
      description: "Link resent",
      triggeredByUserId: requesterId,
      status: "Success",
    });

    return { ...updated, rawToken: linkData.rawToken };
  }

  async researcherReview(
    caseId: string,
    decision: string,
    notes: string | undefined,
    researcherId: string
  ) {
    const c = await this.casesRepo.findById(caseId);
    if (!c) throw new AppError(404, "CASE_NOT_FOUND", "Case not found");

    if (!["COMPLETED", "COMPLETED — MISSING DATA"].includes(c.status)) {
      throw new AppError(400, "INVALID_TRANSITION", "Case is not ready for researcher review");
    }

    const updated = await this.casesRepo.update(caseId, {
      researcherStatus: decision,
      researcherNotes: notes,
      researcherReviewedAt: new Date(),
      assignedResearcherId: researcherId,
      apiPushStatus: decision === "Approved" ? "Pending" : c.apiPushStatus,
    });

    await this.auditService.log({
      caseId,
      step: 14,
      eventType: "Researcher Action",
      description: `Researcher decision: ${decision}`,
      triggeredByUserId: researcherId,
      status: "Success",
    });

    if (decision === "Approved" && c.analystId) {
      await this.notificationsService.create({
        userId: c.analystId,
        type: "review",
        title: `Case ${c.caseRef} approved`,
        body: notes ?? "Researcher approved the submission",
        caseId,
      });
    }

    return updated;
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
        step: 15,
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
