import { describe, it, expect, beforeEach, vi } from "vitest";
import { CompaniesController } from "../../../../src/modules/companies/companies.controller.js";
import type { CompaniesService } from "../../../../src/modules/companies/companies.service.js";
import { createMockRequest, createMockResponse } from "../../../helpers/mock-express.js";

describe("CompaniesController", () => {
  let companiesService: CompaniesService;
  let controller: CompaniesController;
  let res: ReturnType<typeof createMockResponse>;

  const mockCompany = { uid: "comp-1", name: "Acme Corp" } as never;

  beforeEach(() => {
    companiesService = {
      getByUid: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    } as unknown as CompaniesService;

    controller = new CompaniesController(companiesService);
    res = createMockResponse();
  });

  describe("getByUid", () => {
    it("returns a company by uid", async () => {
      vi.mocked(companiesService.getByUid).mockResolvedValue(mockCompany);
      const req = createMockRequest({ params: { uid: "comp-1" } });

      await controller.getByUid(req, res);

      expect(companiesService.getByUid).toHaveBeenCalledWith("comp-1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockCompany }));
    });
  });

  describe("list", () => {
    it("returns paginated companies", async () => {
      vi.mocked(companiesService.list).mockResolvedValue({ data: [mockCompany], total: 1 });
      const req = createMockRequest({ query: { page: "1", limit: "20" } });

      await controller.list(req, res);

      expect(companiesService.list).toHaveBeenCalledWith(0, 20);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [mockCompany],
          meta: { page: 1, limit: 20, total: 1 },
        })
      );
    });
  });

  describe("create", () => {
    it("creates a company and returns 201", async () => {
      const body = { name: "New Corp" };
      vi.mocked(companiesService.create).mockResolvedValue(mockCompany);
      const req = createMockRequest({ body });

      await controller.create(req, res);

      expect(companiesService.create).toHaveBeenCalledWith(body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: mockCompany, message: "Company created" })
      );
    });
  });

  describe("update", () => {
    it("updates a company", async () => {
      const body = { name: "Updated Corp" };
      vi.mocked(companiesService.update).mockResolvedValue({ name: "Updated Corp", uid: "comp-1" } as never);
      const req = createMockRequest({ params: { uid: "comp-1" }, body });

      await controller.update(req, res);

      expect(companiesService.update).toHaveBeenCalledWith("comp-1", body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Company updated" })
      );
    });
  });
});
