import { describe, it, expect, beforeEach, vi } from "vitest";
import { CompanyRequestsService } from "../../../../src/modules/company-requests/company-requests.service.js";
import type { CompanyRequestsRepository } from "../../../../src/modules/company-requests/company-requests.repository.js";
import { AppError } from "../../../../src/shared/errors/AppError.js";

const REQUEST_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const payload = {
  orderId: "ORD-10001",
  externalRef: "UID-44529",
  companyName: "Acme Trading LLC",
  country: "UAE",
  riskRating: "Low",
  recipientEmails: ["contact@acme.example"],
};

const storedRow = {
  companyRequestId: REQUEST_ID,
  ...payload,
  status: "Pending",
} as never;

describe("CompanyRequestsService", () => {
  let repo: CompanyRequestsRepository;
  let service: CompanyRequestsService;

  beforeEach(() => {
    repo = {
      upsert: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      markConsumed: vi.fn(),
    } as unknown as CompanyRequestsRepository;
    service = new CompanyRequestsService(repo);
  });

  describe("receive", () => {
    it("upserts the payload with the raw payload attached and returns the row", async () => {
      vi.mocked(repo.upsert).mockResolvedValue(storedRow);

      const result = await service.receive(payload);

      expect(repo.upsert).toHaveBeenCalledWith({ ...payload, rawPayload: payload });
      expect(result).toEqual(storedRow);
    });

    it("propagates repository failures", async () => {
      vi.mocked(repo.upsert).mockRejectedValue(new Error("db down"));

      await expect(service.receive(payload)).rejects.toThrow("db down");
    });
  });

  describe("list", () => {
    it("passes the status filter through to the repository", async () => {
      vi.mocked(repo.findAll).mockResolvedValue([storedRow]);

      await expect(service.list("Pending")).resolves.toEqual([storedRow]);
      expect(repo.findAll).toHaveBeenCalledWith("Pending");
    });

    it("lists without a filter when status is omitted", async () => {
      vi.mocked(repo.findAll).mockResolvedValue([]);

      await expect(service.list()).resolves.toEqual([]);
      expect(repo.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe("getById", () => {
    it("returns the row when found", async () => {
      vi.mocked(repo.findById).mockResolvedValue(storedRow);

      await expect(service.getById(REQUEST_ID)).resolves.toEqual(storedRow);
      expect(repo.findById).toHaveBeenCalledWith(REQUEST_ID);
    });

    it("throws a 404 AppError when not found", async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      const promise = service.getById(REQUEST_ID);
      await expect(promise).rejects.toBeInstanceOf(AppError);
      await expect(service.getById(REQUEST_ID)).rejects.toMatchObject({
        statusCode: 404,
        code: "NOT_FOUND",
      });
    });
  });
});
