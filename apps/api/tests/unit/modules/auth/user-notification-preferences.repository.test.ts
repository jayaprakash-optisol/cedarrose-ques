import { describe, it, expect, beforeEach } from "vitest";
import {
  UserNotificationPreferencesRepository,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "../../../../src/modules/auth/user-notification-preferences.repository.js";
import { createMockDrizzle } from "../../../helpers/mock-drizzle.js";

describe("UserNotificationPreferencesRepository", () => {
  let db: ReturnType<typeof createMockDrizzle>;
  let repo: UserNotificationPreferencesRepository;

  const userId = "11111111-1111-1111-1111-111111111111";
  const prefRow = {
    id: "pref-1",
    userId,
    notifyOnSubmission: false,
    notifyOnLinkExpiry: true,
    notifyOnBlockedDispatch: false,
    notifyOnRemindersSent: true,
    updatedAt: new Date(),
  };

  beforeEach(() => {
    db = createMockDrizzle();
    repo = new UserNotificationPreferencesRepository(db as never);
  });

  describe("findByUserId", () => {
    it("returns defaults when no row exists", async () => {
      db.queueResults([]);
      await expect(repo.findByUserId(userId)).resolves.toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it("returns mapped preferences when row exists", async () => {
      db.queueResults([prefRow]);
      await expect(repo.findByUserId(userId)).resolves.toEqual({
        notifyOnSubmission: false,
        notifyOnLinkExpiry: true,
        notifyOnBlockedDispatch: false,
        notifyOnRemindersSent: true,
      });
    });
  });

  describe("upsert", () => {
    it("inserts with defaults plus partial updates", async () => {
      db.queueResults([], []);
      const result = await repo.upsert(userId, { notifyOnSubmission: false });
      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual({
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        notifyOnSubmission: false,
      });
    });

    it("merges existing preferences with updates", async () => {
      db.queueResults([prefRow], []);
      const result = await repo.upsert(userId, { notifyOnSubmission: true });
      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual({
        notifyOnSubmission: true,
        notifyOnLinkExpiry: true,
        notifyOnBlockedDispatch: false,
        notifyOnRemindersSent: true,
      });
    });

    it("updates multiple preferences at once", async () => {
      db.queueResults([], []);
      const result = await repo.upsert(userId, {
        notifyOnSubmission: false,
        notifyOnRemindersSent: false,
      });
      expect(result).toEqual({
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        notifyOnSubmission: false,
        notifyOnRemindersSent: false,
      });
    });
  });
});
