import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotificationsController } from "../../../../src/modules/notifications/notifications.controller.js";
import type { NotificationsService } from "../../../../src/modules/notifications/notifications.service.js";
import { createMockRequest, createMockResponse } from "../../../helpers/mock-express.js";
import { createMockUser } from "../../../helpers/mock-user.js";

describe("NotificationsController", () => {
  let notificationsService: NotificationsService;
  let controller: NotificationsController;
  let res: ReturnType<typeof createMockResponse>;

  const mockNotification = { id: "notif-1", message: "Case updated", read: false } as never;

  beforeEach(() => {
    notificationsService = {
      list: vi.fn(),
      create: vi.fn(),
      notifySubmission: vi.fn(),
      notifyReviewApproved: vi.fn(),
      notifyExpired: vi.fn(),
      notifyStale: vi.fn(),
      sendReminder: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      delete: vi.fn(),
    } as unknown as NotificationsService;

    controller = new NotificationsController(notificationsService);
    res = createMockResponse();
  });

  describe("list", () => {
    it("returns paginated notifications for the user", async () => {
      const user = createMockUser();
      vi.mocked(notificationsService.list).mockResolvedValue({ data: [mockNotification], total: 1 });
      const req = createMockRequest({ user, query: { page: "1", limit: "10" } });

      await controller.list(req, res);

      expect(notificationsService.list).toHaveBeenCalledWith(user.userId, 0, 10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [mockNotification],
          meta: { page: 1, limit: 10, total: 1 },
        })
      );
    });
  });

  describe("markRead", () => {
    it("marks a notification as read", async () => {
      const user = createMockUser();
      const req = createMockRequest({ user, params: { id: "notif-1" } });

      await controller.markRead(req, res);

      expect(notificationsService.markRead).toHaveBeenCalledWith("notif-1", user.userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Notification marked as read" })
      );
    });
  });

  describe("markAllRead", () => {
    it("marks all notifications as read", async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });

      await controller.markAllRead(req, res);

      expect(notificationsService.markAllRead).toHaveBeenCalledWith(user.userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "All notifications marked as read" })
      );
    });
  });

  describe("delete", () => {
    it("deletes a notification", async () => {
      const user = createMockUser();
      const req = createMockRequest({ user, params: { id: "notif-1" } });

      await controller.delete(req, res);

      expect(notificationsService.delete).toHaveBeenCalledWith("notif-1", user.userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Notification deleted" })
      );
    });
  });
});
