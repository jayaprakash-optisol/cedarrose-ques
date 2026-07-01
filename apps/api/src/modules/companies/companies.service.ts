import type { CompaniesRepository } from "./companies.repository.js";
import { AppError } from "../../shared/errors/AppError.js";

export class CompaniesService {
  constructor(private readonly companiesRepo: CompaniesRepository) {}

  async getByUid(uid: string) {
    const company = await this.companiesRepo.findByCrisNumber(uid);
    if (!company) throw new AppError(404, "NOT_FOUND", `Company ${uid} not found`);
    const emailRows = await this.companiesRepo.getRecipientEmails(company.companyId);
    const recipientEmails = emailRows
      .toSorted((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
      .map((row) => row.email);
    return { ...company, uid: company.crisNumber, recipientEmails };
  }

  async list(offset: number, limit: number) {
    return this.companiesRepo.findAll(offset, limit);
  }

  async create(dto: {
    companyName: string;
    crisNumber: string;
    country?: string;
    riskRating?: string;
    recipientEmails?: string[];
  }) {
    const existing = await this.companiesRepo.findByCrisNumber(dto.crisNumber);
    if (existing) throw new AppError(409, "VALIDATION_ERROR", "Company UID already exists");

    const company = await this.companiesRepo.create({
      companyName: dto.companyName,
      crisNumber: dto.crisNumber,
      country: dto.country,
      riskRating: dto.riskRating,
    });

    if (dto.recipientEmails?.length) {
      for (let i = 0; i < dto.recipientEmails.length; i++) {
        await this.companiesRepo.addRecipientEmail(company.companyId, dto.recipientEmails[i], i === 0);
      }
    }

    return company;
  }

  async update(uid: string, dto: Partial<{
    companyName: string;
    country: string;
    riskRating: string;
    legalStructure: string;
    primaryIndustry: string;
  }>) {
    const company = await this.companiesRepo.findByCrisNumber(uid);
    if (!company) throw new AppError(404, "NOT_FOUND", `Company ${uid} not found`);
    return this.companiesRepo.update(company.companyId, dto);
  }
}
