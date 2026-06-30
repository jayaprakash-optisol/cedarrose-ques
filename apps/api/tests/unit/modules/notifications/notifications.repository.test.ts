import { describe, it, expect, beforeEach } from "vitest";
import { NotificationsRepository } from "../../../../src/modules/notifications/notifications.repository.js";
import { createMockDrizzle } from "../../../helpers/mock-drizzle.js";

describe("NotificationsRepository", () => {
  let db: ReturnType<typeof createMockDrizzle>;
  let repo: NotificationsRepository;

  const userId = "11111111-1111-1111-1111-111111111111";
  const notificationRow = {
    notificationId: "99999999-9999-9999-9999-999999999999",
    userId,
    type: "CaseUpdate",
    title: "Case updated",
    body: "A case was updated",
    read: false,
    caseId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  beforeEach(() => {
    db = createMockDrizzle();
    repo = new NotificationsRepository(db as never);
  });

  it("findByUser returns paginated notifications", async () => {
    db.queueResults([notificationRow], [{ total: 1 }]);
    await expect(repo.findByUser(userId, 0, 10)).resolves.toEqual({
      data: [notificationRow],
      total: 1,
    });
  });

  it("create inserts and returns notification", async () => {
    db.queueResults(notificationRow);
    await expect(
      repo.create({
        userId,
        type: "CaseUpdate",
        title: "Case updated",
        body: "A case was updated",
      })
    ).resolves.toEqual(notificationRow);
    expect(db.insert).toHaveBeenCalled();
  });

  it("markRead updates notification for user", async () => {
    db.queueResults([]);
    await repo.markRead(notificationRow.notificationId, userId);
    expect(db.update).toHaveBeenCalled();
  });

  it("markAllRead updates all notifications for user", async () => {
    db.queueResults([]);
    await repo.markAllRead(userId);
    expect(db.update).toHaveBeenCalled();
  });

  it("delete removes notification for user", async () => {
    db.queueResults([]);
    await repo.delete(notificationRow.notificationId, userId);
    expect(db.delete).toHaveBeenCalled();
  });
});
