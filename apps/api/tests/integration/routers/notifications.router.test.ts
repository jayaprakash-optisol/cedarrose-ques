import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { notificationsRouter } from "../../../src/modules/notifications/notifications.router.js";
import { NotificationsController } from "../../../src/modules/notifications/notifications.controller.js";
import type { NotificationsService } from "../../../src/modules/notifications/notifications.service.js";
import { errorHandler } from "../../../src/middleware/error-handler.js";
import { createMockUser } from "../../helpers/mock-user.js";

function createMockNotificationsService(): NotificationsService {
  return {
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
  } as unknown as NotificationsService;
}

function createNotificationsApp(service: NotificationsService) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = createMockUser({ role: "Analyst" });
    next();
  });
  app.use("/api/v1/notifications", notificationsRouter(new NotificationsController(service)));
  app.use(errorHandler);
  return app;
}

describe("notifications router", () => {
  let service: ReturnType<typeof createMockNotificationsService>;

  beforeEach(() => {
    service = createMockNotificationsService();
  });

  it("GET / lists notifications", async () => {
    vi.mocked(service.list).mockResolvedValue({ data: [{ notificationId: "n-1" }], total: 1 } as never);
    const app = createNotificationsApp(service);

    const res = await request(app).get("/api/v1/notifications");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("PATCH /read-all marks all notifications read", async () => {
    vi.mocked(service.markAllRead).mockResolvedValue(undefined);
    const app = createNotificationsApp(service);

    const res = await request(app).patch("/api/v1/notifications/read-all");

    expect(res.status).toBe(200);
    expect(service.markAllRead).toHaveBeenCalled();
  });

  it("PATCH /:id/read marks one notification read", async () => {
    vi.mocked(service.markRead).mockResolvedValue(undefined);
    const app = createNotificationsApp(service);

    const res = await request(app).patch("/api/v1/notifications/n-1/read");

    expect(res.status).toBe(200);
    expect(service.markRead).toHaveBeenCalledWith("n-1", expect.any(String));
  });

  it("DELETE /:id deletes notification", async () => {
    vi.mocked(service.delete).mockResolvedValue(undefined);
    const app = createNotificationsApp(service);

    const res = await request(app).delete("/api/v1/notifications/n-1");

    expect(res.status).toBe(200);
    expect(service.delete).toHaveBeenCalledWith("n-1", expect.any(String));
  });
});
