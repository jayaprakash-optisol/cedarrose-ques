import { describe, it, expect, beforeEach, vi } from "vitest";
import { CompaniesService } from "../../../../src/modules/companies/companies.service.js";
import { createMockCompaniesRepository } from "../../../helpers/mock-repositories.js";

function createMockCompany(overrides: Record<string, unknown> = {}) {
  return {
    companyId: "44444444-4444-4444-4444-444444444444",
    companyName: "Acme Ltd",
    crisNumber: "CRIS-1001",
    country: "GB",
    riskRating: "Low",
    incorporationDate: null,
    legalStructure: null,
    primaryIndustry: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("CompaniesService", () => {
  let repo: ReturnType<typeof createMockCompaniesRepository>;
  let service: CompaniesService;

  beforeEach(() => {
    repo = createMockCompaniesRepository();
    service = new CompaniesService(repo);
  });

  describe("getByUid", () => {
    it("throws when company is not found", async () => {
      vi.mocked(repo.findByCrisNumber).mockResolvedValue(null);
      await expect(service.getByUid("missing")).rejects.toMatchObject({
        statusCode: 404,
        code: "NOT_FOUND",
      });
    });

    it("returns company with uid alias and primary-first recipient emails", async () => {
      const company = createMockCompany();
      vi.mocked(repo.findByCrisNumber).mockResolvedValue(company);
      vi.mocked(repo.getRecipientEmails).mockResolvedValue([
        { emailId: "e2", companyId: company.companyId, email: "secondary@test.com", isPrimary: false, createdAt: new Date() },
        { emailId: "e1", companyId: company.companyId, email: "primary@test.com", isPrimary: true, createdAt: new Date() },
      ]);

      const result = await service.getByUid(company.crisNumber);

      expect(result.uid).toBe(company.crisNumber);
      expect(result.recipientEmails).toEqual(["primary@test.com", "secondary@test.com"]);
    });
  });

  describe("list", () => {
    it("delegates to repository", async () => {
      const payload = { data: [createMockCompany()], total: 1 };
      vi.mocked(repo.findAll).mockResolvedValue(payload);

      await expect(service.list(0, 20)).resolves.toEqual(payload);
      expect(repo.findAll).toHaveBeenCalledWith(0, 20);
    });
  });

  describe("create", () => {
    it("rejects duplicate CRiS numbers", async () => {
      vi.mocked(repo.findByCrisNumber).mockResolvedValue(createMockCompany());

      await expect(
        service.create({ companyName: "Dup", crisNumber: "CRIS-1001" }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Company UID already exists",
      });
    });

    it("creates company without recipient emails", async () => {
      const company = createMockCompany();
      vi.mocked(repo.findByCrisNumber).mockResolvedValue(null);
      vi.mocked(repo.create).mockResolvedValue(company);

      const result = await service.create({
        companyName: "Acme Ltd",
        crisNumber: "CRIS-NEW",
        country: "GB",
      });

      expect(result).toEqual(company);
      expect(repo.addRecipientEmail).not.toHaveBeenCalled();
    });

    it("adds recipient emails with first marked primary", async () => {
      const company = createMockCompany({ crisNumber: "CRIS-NEW" });
      vi.mocked(repo.findByCrisNumber).mockResolvedValue(null);
      vi.mocked(repo.create).mockResolvedValue(company);

      await service.create({
        companyName: "Acme Ltd",
        crisNumber: "CRIS-NEW",
        recipientEmails: ["first@test.com", "second@test.com"],
      });

      expect(repo.addRecipientEmail).toHaveBeenCalledTimes(2);
      expect(repo.addRecipientEmail).toHaveBeenNthCalledWith(1, company.companyId, "first@test.com", true);
      expect(repo.addRecipientEmail).toHaveBeenNthCalledWith(2, company.companyId, "second@test.com", false);
    });
  });

  describe("update", () => {
    it("throws when company is not found", async () => {
      vi.mocked(repo.findByCrisNumber).mockResolvedValue(null);
      await expect(service.update("missing", { companyName: "X" })).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("updates company by uid", async () => {
      const company = createMockCompany();
      const updated = { ...company, companyName: "Renamed" };
      vi.mocked(repo.findByCrisNumber).mockResolvedValue(company);
      vi.mocked(repo.update).mockResolvedValue(updated);

      await expect(service.update(company.crisNumber, { companyName: "Renamed" })).resolves.toEqual(updated);
      expect(repo.update).toHaveBeenCalledWith(company.companyId, { companyName: "Renamed" });
    });
  });
});
