import { describe, it, expect, beforeEach, vi } from "vitest";
import { CasesController } from "../../../../src/modules/cases/cases.controller.js";
import type { CasesService } from "../../../../src/modules/cases/cases.service.js";
import { createMockRequest, createMockResponse } from "../../../helpers/mock-express.js";
import { createMockUser } from "../../../helpers/mock-user.js";

describe("CasesController", () => {
  let casesService: CasesService;
  let controller: CasesController;
  let res: ReturnType<typeof createMockResponse>;

  const mockCase = { caseId: "case-1", caseRef: "CR-001", status: "Open" } as never;

  beforeEach(() => {
    casesService = {
      list: vi.fn(),
      getById: vi.fn(),
      createCase: vi.fn(),
      resendLink: vi.fn(),
      apiPush: vi.fn(),
      exportAll: vi.fn(),
    } as unknown as CasesService;

    controller = new CasesController(casesService);
    res = createMockResponse();
  });

  describe("list", () => {
    it("returns paginated cases", async () => {
      vi.mocked(casesService.list).mockResolvedValue({ data: [mockCase], total: 1 });
      const req = createMockRequest({ query: { page: "1", limit: "10", status: "Open" } });

      await controller.list(req, res);

      expect(casesService.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: "Open", offset: 0, limit: 10 })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [mockCase],
          meta: { page: 1, limit: 10, total: 1 },
        })
      );
    });

    it("forwards all list filters from query string", async () => {
      vi.mocked(casesService.list).mockResolvedValue({ data: [], total: 0 });
      const req = createMockRequest({
        query: {
          recipientType: "Supplier",
          country: "GB",
          analystId: "analyst-1",
          search: "Acme",
        },
      });

      await controller.list(req, res);

      expect(casesService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientType: "Supplier",
          country: "GB",
          analystId: "analyst-1",
          search: "Acme",
        }),
      );
    });
  });

  describe("getById", () => {
    it("returns a case by id", async () => {
      vi.mocked(casesService.getById).mockResolvedValue(mockCase);
      const req = createMockRequest({ params: { id: "case-1" } });

      await controller.getById(req, res);

      expect(casesService.getById).toHaveBeenCalledWith("case-1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockCase }));
    });
  });

  describe("create", () => {
    it("creates a case and returns 201", async () => {
      const user = createMockUser();
      const body = { subjectName: "Acme Corp" };
      vi.mocked(casesService.createCase).mockResolvedValue(mockCase);
      const req = createMockRequest({ user, body });

      await controller.create(req, res);

      expect(casesService.createCase).toHaveBeenCalledWith(body, user.userId);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: mockCase, message: "Case created" })
      );
    });
  });

  describe("resendLink", () => {
    it("resends link for a case", async () => {
      const user = createMockUser();
      vi.mocked(casesService.resendLink).mockResolvedValue(mockCase);
      const req = createMockRequest({ user, params: { id: "case-1" } });

      await controller.resendLink(req, res);

      expect(casesService.resendLink).toHaveBeenCalledWith("case-1", user.userId, user.role);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: mockCase, message: "Link resent" })
      );
    });
  });

  describe("apiPush", () => {
    it("triggers API push", async () => {
      const result = { pushed: true } as never;
      vi.mocked(casesService.apiPush).mockResolvedValue(result);
      const req = createMockRequest({ params: { id: "case-1" } });

      await controller.apiPush(req, res);

      expect(casesService.apiPush).toHaveBeenCalledWith("case-1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: result, message: "API push triggered" })
      );
    });
  });

  describe("exportCsv", () => {
    it("exports cases as CSV", async () => {
      vi.mocked(casesService.exportAll).mockResolvedValue([
        {
          caseRef: "CR-001",
          orderId: "ORD-1",
          subjectName: "Acme",
          status: "Open",
          country: "US",
        },
      ] as never);
      const req = createMockRequest();

      await controller.exportCsv(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        "attachment; filename=cases.csv"
      );
      expect(res.send).toHaveBeenCalledWith(
        "caseRef,orderId,subjectName,status,country\nCR-001,ORD-1,Acme,Open,US"
      );
    });

    it("sanitizes null csv cells", async () => {
      vi.mocked(casesService.exportAll).mockResolvedValue([
        {
          caseRef: "CR-002",
          orderId: null,
          subjectName: "Beta",
          status: "Open",
          country: null,
        },
      ] as never);
      const req = createMockRequest();

      await controller.exportCsv(req, res);

      expect(res.send).toHaveBeenCalledWith("caseRef,orderId,subjectName,status,country\nCR-002,,Beta,Open,");
    });
  });
});
