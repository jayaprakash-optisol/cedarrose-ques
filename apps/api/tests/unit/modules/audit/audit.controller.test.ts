import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuditController } from "../../../../src/modules/audit/audit.controller.js";
import type { AuditService } from "../../../../src/modules/audit/audit.service.js";
import { createMockRequest, createMockResponse } from "../../../helpers/mock-express.js";

describe("AuditController", () => {
  let auditService: AuditService;
  let controller: AuditController;
  let res: ReturnType<typeof createMockResponse>;

  const mockEntry = {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    eventType: "CASE_CREATED",
    description: "Case created",
    status: "Success",
    caseId: "case-1",
    caseSubject: "Acme",
    caseOrderId: "ORD-1",
    step: 1,
    triggeredBy: "Admin",
    caseStatus: "SENT",
  } as never;

  beforeEach(() => {
    auditService = {
      log: vi.fn(),
      list: vi.fn(),
      exportBatches: vi.fn(),
    } as unknown as AuditService;

    controller = new AuditController(auditService);
    res = createMockResponse();
    vi.mocked(res.write).mockImplementation(() => true);
  });

  describe("list", () => {
    it("returns paginated audit entries", async () => {
      vi.mocked(auditService.list).mockResolvedValue({ data: [mockEntry], total: 1 });
      const req = createMockRequest({
        query: { page: "1", limit: "10", caseId: "case-1", type: "CASE_CREATED" },
      });

      await controller.list(req, res);

      expect(auditService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: "case-1",
          type: "CASE_CREATED",
          offset: 0,
          limit: 10,
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [mockEntry],
          meta: { page: 1, limit: 10, total: 1 },
        })
      );
    });

    it("passes search and date filters", async () => {
      vi.mocked(auditService.list).mockResolvedValue({ data: [], total: 0 });
      const req = createMockRequest({
        query: {
          search: "Acme",
          status: "Failed",
          from: "2026-01-01",
          to: "2026-01-31",
        },
      });

      await controller.list(req, res);

      expect(auditService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "Acme",
          status: "Failed",
          from: expect.any(Date),
          to: expect.any(Date),
        }),
      );
    });
  });

  describe("exportCsv", () => {
    it("streams audit log as CSV", async () => {
      async function* batches() {
        yield [mockEntry];
      }
      vi.mocked(auditService.exportBatches).mockReturnValue(batches());

      const req = createMockRequest({ query: { caseId: "case-1", search: "Acme" } });
      await controller.exportCsv(req, res);

      expect(auditService.exportBatches).toHaveBeenCalledWith(
        expect.objectContaining({ caseId: "case-1", search: "Acme" })
      );
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining("Timestamp,Case,Order"));
      expect(res.end).toHaveBeenCalled();
    });
  });
});
