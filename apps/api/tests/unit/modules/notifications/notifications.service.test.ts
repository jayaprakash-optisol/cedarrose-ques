import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotificationsService } from "../../../../src/modules/notifications/notifications.service.js";
import type { NotificationsRepository } from "../../../../src/modules/notifications/notifications.repository.js";
import type { CasesRepository } from "../../../../src/modules/cases/cases.repository.js";
import {
  createMockCasesRepository,
  createMockNotificationsRepository,
} from "../../../helpers/mock-repositories.js";
import { createMockCase } from "../../../helpers/mock-case.js";

function caseWithCompany() {
  return {
    ...createMockCase(),
    analystName: "Test Analyst",
    company: {
      companyName: "Acme Ltd",
      crisNumber: "CRIS-1001",
      country: "GB",
      riskRating: "Low",
      incorporationDate: null,
      legalStructure: null,
      primaryIndustry: null,
      recipientEmails: ["recipient@test.com"],
    },
    stepTimestamps: {},
  };
}

describe("NotificationsService", () => {
  let notificationsRepo: ReturnType<typeof createMockNotificationsRepository>;
  let casesRepo: ReturnType<typeof createMockCasesRepository>;
  let service: NotificationsService;

  const userId = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    notificationsRepo = createMockNotificationsRepository();
    casesRepo = createMockCasesRepository();
    service = new NotificationsService(
      notificationsRepo as unknown as NotificationsRepository,
      casesRepo as unknown as CasesRepository,
    );
  });

  describe("list", () => {
    it("enriches notifications with dynamic copy from case context", async () => {
      const c = caseWithCompany();
      vi.mocked(notificationsRepo.findByUser).mockResolvedValue({
        data: [
          {
            notificationId: "n1",
            userId,
            type: "submission",
            title: "placeholder",
            body: "",
            caseId: c.caseId,
            read: false,
            createdAt: new Date(),
          },
        ],
        total: 1,
      });
      vi.mocked(casesRepo.findById).mockResolvedValue(c);

      const result = await service.list(userId, 0, 20);

      expect(result.data[0].title).toBe("New submission received");
      expect(result.data[0].body).toContain("Acme Ltd (ORD-1001)");
    });
  });

  describe("create", () => {
    it("builds copy when case context exists", async () => {
      const c = caseWithCompany();
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      vi.mocked(notificationsRepo.create).mockResolvedValue({
        notificationId: "n2",
        userId,
        type: "expired",
        title: "Questionnaire link expired",
        body: "body",
        caseId: c.caseId,
        read: false,
        createdAt: new Date(),
      });

      await service.create({
        userId,
        type: "expired",
        title: "",
        body: "",
        caseId: c.caseId,
      });

      expect(notificationsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Questionnaire link expired",
          body: expect.stringContaining("link expired"),
        }),
      );
    });

    it("passes through when no case context", async () => {
      vi.mocked(casesRepo.findById).mockResolvedValue(null);
      const payload = {
        userId,
        type: "api" as const,
        title: "Static",
        body: "Static body",
      };
      vi.mocked(notificationsRepo.create).mockResolvedValue({
        notificationId: "n3",
        ...payload,
        caseId: null,
        read: false,
        createdAt: new Date(),
      });

      await service.create({ ...payload, caseId: "missing" });

      expect(notificationsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Static", body: "Static body" }),
      );
    });
  });

  describe("notify helpers", () => {
    it("notifySubmission delegates to create", async () => {
      const c = caseWithCompany();
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      vi.mocked(notificationsRepo.create).mockResolvedValue({} as never);

      await service.notifySubmission(c.caseId, userId);

      expect(notificationsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "submission", userId, caseId: c.caseId }),
      );
    });

    it("notifyReviewApproved creates review notification", async () => {
      const c = caseWithCompany();
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      vi.mocked(notificationsRepo.create).mockResolvedValue({} as never);

      await service.notifyReviewApproved(c.caseId, userId, "Approved with notes");

      expect(notificationsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "review",
          body: expect.stringContaining("Approved with notes"),
        }),
      );
    });

    it("notifyReviewApproved no-ops when case missing", async () => {
      vi.mocked(casesRepo.findById).mockResolvedValue(null);
      await service.notifyReviewApproved("missing", userId);
      expect(notificationsRepo.create).not.toHaveBeenCalled();
    });

    it("notifyExpired creates expired notification", async () => {
      const c = caseWithCompany();
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      vi.mocked(notificationsRepo.create).mockResolvedValue({} as never);

      await service.notifyExpired(c.caseId, userId);

      expect(notificationsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "expired" }),
      );
    });

    it("notifyStale creates stale notification with hours", async () => {
      const c = caseWithCompany();
      vi.mocked(casesRepo.findById).mockResolvedValue(c);
      vi.mocked(notificationsRepo.create).mockResolvedValue({} as never);

      await service.notifyStale(c.caseId, userId, 48);

      expect(notificationsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "stale",
          body: expect.stringContaining("48 hours"),
        }),
      );
    });

    it("sendReminder increments reminder number from context", async () => {
      const c = caseWithCompany();
      vi.mocked(casesRepo.findById).mockResolvedValue({ ...c, remindersSent: 1 });
      vi.mocked(notificationsRepo.create).mockResolvedValue({} as never);

      await service.sendReminder({ caseId: c.caseId, analystId: userId });

      expect(notificationsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "reminder",
          body: expect.stringContaining("Reminder 2"),
        }),
      );
    });

    it("sendReminder no-ops without analyst", async () => {
      await service.sendReminder({ caseId: "case", analystId: null });
      expect(notificationsRepo.create).not.toHaveBeenCalled();
    });

    it("sendReminder no-ops when case is missing", async () => {
      vi.mocked(casesRepo.findById).mockResolvedValue(null);
      await service.sendReminder({ caseId: "missing", analystId: userId });
      expect(notificationsRepo.create).not.toHaveBeenCalled();
    });

    it("notifyStale no-ops when case is missing", async () => {
      vi.mocked(casesRepo.findById).mockResolvedValue(null);
      await service.notifyStale("missing", userId, 72);
      expect(notificationsRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("list enrichment branches", () => {
    it("enriches stale and reminder notifications differently", async () => {
      const c = caseWithCompany();
      vi.mocked(notificationsRepo.findByUser).mockResolvedValue({
        data: [
          {
            notificationId: "n-stale",
            userId,
            type: "stale",
            title: "placeholder",
            body: "",
            caseId: c.caseId,
            read: false,
            createdAt: new Date(),
          },
          {
            notificationId: "n-reminder",
            userId,
            type: "reminder",
            title: "placeholder",
            body: "",
            caseId: c.caseId,
            read: false,
            createdAt: new Date(),
          },
          {
            notificationId: "n-static",
            userId,
            type: "api",
            title: "Static",
            body: "No case",
            caseId: null,
            read: false,
            createdAt: new Date(),
          },
        ],
        total: 3,
      });
      vi.mocked(casesRepo.findById).mockResolvedValue({ ...c, remindersSent: 2 });

      const result = await service.list(userId, 0, 20);

      expect(result.data[0].body).toContain("72 hours");
      expect(result.data[1].body).toContain("Reminder 2");
      expect(result.data[2]).toEqual(
        expect.objectContaining({ title: "Static", body: "No case" }),
      );
    });

    it("returns row unchanged when case context is missing", async () => {
      vi.mocked(notificationsRepo.findByUser).mockResolvedValue({
        data: [
          {
            notificationId: "n1",
            userId,
            type: "submission",
            title: "placeholder",
            body: "",
            caseId: "missing-case",
            read: false,
            createdAt: new Date(),
          },
        ],
        total: 1,
      });
      vi.mocked(casesRepo.findById).mockResolvedValue(null);

      const result = await service.list(userId, 0, 20);
      expect(result.data[0].title).toBe("placeholder");
    });
  });

  describe("create type branches", () => {
    it("builds stale and reminder copy on create", async () => {
      const c = caseWithCompany();
      vi.mocked(casesRepo.findById).mockResolvedValue({ ...c, remindersSent: 0 });
      vi.mocked(notificationsRepo.create).mockResolvedValue({} as never);

      await service.create({
        userId,
        type: "stale",
        title: "",
        body: "",
        caseId: c.caseId,
      });
      await service.create({
        userId,
        type: "reminder",
        title: "",
        body: "",
        caseId: c.caseId,
      });

      expect(notificationsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "stale", body: expect.stringContaining("72 hours") }),
      );
      expect(notificationsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "reminder", body: expect.stringContaining("Reminder 1") }),
      );
    });

    it("creates without case enrichment when caseId is omitted", async () => {
      vi.mocked(notificationsRepo.create).mockResolvedValue({} as never);
      await service.create({
        userId,
        type: "api",
        title: "Manual",
        body: "Body",
      });
      expect(casesRepo.findById).not.toHaveBeenCalled();
      expect(notificationsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Manual" }),
      );
    });
  });

  describe("read state", () => {
    it("markRead delegates to repository", async () => {
      await service.markRead("n1", userId);
      expect(notificationsRepo.markRead).toHaveBeenCalledWith("n1", userId);
    });

    it("markAllRead delegates to repository", async () => {
      await service.markAllRead(userId);
      expect(notificationsRepo.markAllRead).toHaveBeenCalledWith(userId);
    });

    it("delete delegates to repository", async () => {
      await service.delete("n1", userId);
      expect(notificationsRepo.delete).toHaveBeenCalledWith("n1", userId);
    });
  });
});
