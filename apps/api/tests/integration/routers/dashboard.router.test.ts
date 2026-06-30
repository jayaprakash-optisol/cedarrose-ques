import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { dashboardRouter } from "../../../src/modules/dashboard/dashboard.router.js";
import { DashboardController } from "../../../src/modules/dashboard/dashboard.controller.js";
import type { DashboardService } from "../../../src/modules/dashboard/dashboard.service.js";
import { errorHandler } from "../../../src/middleware/error-handler.js";
import { createMockUser } from "../../helpers/mock-user.js";

function createMockDashboardService(): DashboardService {
  return {
    getCompletionStats: vi.fn(),
  } as unknown as DashboardService;
}

function createDashboardApp(service: DashboardService) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = createMockUser({ role: "Analyst" });
    next();
  });
  app.use("/api/v1/dashboard", dashboardRouter(new DashboardController(service)));
  app.use(errorHandler);
  return app;
}

describe("dashboard router", () => {
  let service: ReturnType<typeof createMockDashboardService>;

  beforeEach(() => {
    service = createMockDashboardService();
  });

  it("GET /completion-stats returns stats for valid period", async () => {
    vi.mocked(service.getCompletionStats).mockResolvedValue({ completed: 3, total: 10 } as never);
    const app = createDashboardApp(service);

    const res = await request(app).get("/api/v1/dashboard/completion-stats?period=7d");

    expect(res.status).toBe(200);
    expect(service.getCompletionStats).toHaveBeenCalledWith("7d");
  });

  it("GET /completion-stats defaults to 30d", async () => {
    vi.mocked(service.getCompletionStats).mockResolvedValue({ completed: 1, total: 2 } as never);
    const app = createDashboardApp(service);

    const res = await request(app).get("/api/v1/dashboard/completion-stats");

    expect(res.status).toBe(200);
    expect(service.getCompletionStats).toHaveBeenCalledWith("30d");
  });

  it("GET /completion-stats rejects invalid period", async () => {
    const app = createDashboardApp(service);
    const res = await request(app).get("/api/v1/dashboard/completion-stats?period=invalid");
    expect(res.status).toBe(400);
  });
});
