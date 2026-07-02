import type { CompanyRequestsRepository } from "./company-requests.repository.js";
import { AppError } from "../../shared/errors/AppError.js";
import { logger } from "../../config/logger.js";

export class CompanyRequestsService {
  constructor(private readonly repo: CompanyRequestsRepository) {}

  async receive(payload: {
    orderId: string;
    externalRef: string;
    companyName: string;
    country: string;
    riskRating?: string;
    incorporationDate?: string;
    legalStructure?: string;
    primaryIndustry?: string;
    recipientType?: string;
    recipientEmails: string[];
  }) {
    const row = await this.repo.upsert({
      ...payload,
      rawPayload: payload,
    });
    logger.info(
      { companyRequestId: row.companyRequestId, orderId: payload.orderId, externalRef: payload.externalRef },
      "company_request.received"
    );
    return row;
  }

  async list(status?: string) {
    return this.repo.findAll(status);
  }

  async getById(companyRequestId: string) {
    const row = await this.repo.findById(companyRequestId);
    if (!row) throw new AppError(404, "NOT_FOUND", `Company request ${companyRequestId} not found`);
    return row;
  }
}
