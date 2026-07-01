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
      exportBatches: vi.fn(),
    } as unknown as CasesService;

    controller = new CasesController(casesService);
    res = createMockResponse();
    vi.mocked(res.write).mockImplementation(() => true);
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

    it("forwards date filters from query string", async () => {
      vi.mocked(casesService.list).mockResolvedValue({ data: [], total: 0 });
      const req = createMockRequest({
        query: {
          recipientType: "Supplier",
          country: "GB",
          analystId: "analyst-1",
          search: "Acme",
          from: "2026-01-01",
          to: "2026-01-31",
        },
      });

      await controller.list(req, res);

      expect(casesService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientType: "Supplier",
          country: "GB",
          analystId: "analyst-1",
          search: "Acme",
          from: expect.any(Date),
          to: expect.any(Date),
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
    it("streams cases as CSV", async () => {
      async function* batches() {
        yield [
          {
            orderId: "ORD-1",
            subjectName: "Acme",
            country: "US",
            recipientType: "Supplier",
            status: "Open",
            completionMandatory: 80,
            dateReceived: new Date("2026-01-01T00:00:00.000Z"),
            lastActivity: new Date("2026-01-02T00:00:00.000Z"),
            researcherStatus: "Not Applicable",
          },
        ];
      }
      vi.mocked(casesService.exportBatches).mockReturnValue(batches());
      const req = createMockRequest({ query: { search: "Acme" } });

      await controller.exportCsv(req, res);

      expect(casesService.exportBatches).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Acme" }),
      );
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining("Order ID,Company name"));
      expect(res.end).toHaveBeenCalled();
    });
  });
});
