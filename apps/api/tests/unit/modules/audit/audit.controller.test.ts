import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuditController } from "../../../../src/modules/audit/audit.controller.js";
import type { AuditService } from "../../../../src/modules/audit/audit.service.js";
import { createMockRequest, createMockResponse } from "../../../helpers/mock-express.js";

describe("AuditController", () => {
  let auditService: AuditService;
  let controller: AuditController;
  let res: ReturnType<typeof createMockResponse>;

  const mockEntry = {
    createdAt: "2026-01-01T00:00:00.000Z",
    eventType: "CASE_CREATED",
    description: "Case created",
    status: "Success",
    caseId: "case-1",
  };

  beforeEach(() => {
    auditService = {
      log: vi.fn(),
      list: vi.fn(),
      export: vi.fn(),
    } as unknown as AuditService;

    controller = new AuditController(auditService);
    res = createMockResponse();
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

    it("passes optional date and status filters", async () => {
      vi.mocked(auditService.list).mockResolvedValue({ data: [], total: 0 });
      const req = createMockRequest({
        query: {
          status: "Failed",
          from: "2026-01-01",
          to: "2026-01-31",
        },
      });

      await controller.list(req, res);

      expect(auditService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "Failed",
          from: expect.any(Date),
          to: expect.any(Date),
        }),
      );
    });
  });

  describe("exportCsv", () => {
    it("exports audit log as CSV", async () => {
      vi.mocked(auditService.export).mockResolvedValue([mockEntry]);
      const req = createMockRequest({ query: { caseId: "case-1" } });

      await controller.exportCsv(req, res);

      expect(auditService.export).toHaveBeenCalledWith(
        expect.objectContaining({ caseId: "case-1" })
      );
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        "attachment; filename=audit-log.csv"
      );
      expect(res.send).toHaveBeenCalledWith(
        expect.stringContaining("createdAt,eventType,description,status,caseId")
      );
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining("CASE_CREATED"));
    });
  });
});
