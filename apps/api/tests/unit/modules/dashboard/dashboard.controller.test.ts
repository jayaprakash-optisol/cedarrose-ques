import { describe, it, expect, beforeEach, vi } from "vitest";
import { DashboardController } from "../../../../src/modules/dashboard/dashboard.controller.js";
import type { DashboardService } from "../../../../src/modules/dashboard/dashboard.service.js";
import { AppError } from "../../../../src/shared/errors/AppError.js";
import { createMockRequest, createMockResponse } from "../../../helpers/mock-express.js";

describe("DashboardController", () => {
  let dashboardService: DashboardService;
  let controller: DashboardController;
  let res: ReturnType<typeof createMockResponse>;

  const mockStats = { completed: 10, total: 20 };

  beforeEach(() => {
    dashboardService = {
      getCompletionStats: vi.fn(),
    } as unknown as DashboardService;

    controller = new DashboardController(dashboardService);
    res = createMockResponse();
  });

  describe("completionStats", () => {
    it("returns completion stats for default period", async () => {
      vi.mocked(dashboardService.getCompletionStats).mockResolvedValue(mockStats);
      const req = createMockRequest({ query: {} });

      await controller.completionStats(req, res);

      expect(dashboardService.getCompletionStats).toHaveBeenCalledWith("30d");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockStats }));
    });

    it("returns completion stats for requested period", async () => {
      vi.mocked(dashboardService.getCompletionStats).mockResolvedValue(mockStats);
      const req = createMockRequest({ query: { period: "7d" } });

      await controller.completionStats(req, res);

      expect(dashboardService.getCompletionStats).toHaveBeenCalledWith("7d");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("throws for invalid period", async () => {
      const req = createMockRequest({ query: { period: "invalid" } });

      await expect(controller.completionStats(req, res)).rejects.toBeInstanceOf(AppError);
      expect(dashboardService.getCompletionStats).not.toHaveBeenCalled();
    });
  });
});
