import { describe, it, expect, beforeEach } from "vitest";
import { UsersRepository } from "../../../../src/modules/users/users.repository.js";
import { createMockDrizzle } from "../../../helpers/mock-drizzle.js";
import { createMockUser } from "../../../helpers/mock-user.js";

describe("UsersRepository", () => {
  let db: ReturnType<typeof createMockDrizzle>;
  let repo: UsersRepository;

  const user = createMockUser();
  const invitation = {
    id: "inv-1",
    userId: user.userId,
    token: "invite-token",
    used: false,
    expiresAt: new Date("2026-12-31T00:00:00.000Z"),
    lastResentAt: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    db = createMockDrizzle();
    repo = new UsersRepository(db as never);
  });

  it("findAll returns paginated users with optional role filter", async () => {
    db.queueResults([user], [{ total: 1 }]);
    await expect(repo.findAll({ role: "Admin", offset: 0, limit: 10 })).resolves.toEqual({
      data: [user],
      total: 1,
    });

    db.queueResults([], [{ total: 0 }]);
    await expect(repo.findAll({ offset: 0, limit: 20 })).resolves.toEqual({ data: [], total: 0 });
  });

  it("findById and findByEmail return row or null", async () => {
    db.queueResults([user]);
    await expect(repo.findById(user.userId)).resolves.toEqual(user);

    db.queueResults([]);
    await expect(repo.findById("missing")).resolves.toBeNull();

    db.queueResults([user]);
    await expect(repo.findByEmail(user.email)).resolves.toEqual(user);
  });

  it("create and update support optional transaction client", async () => {
    db.queueResults(user);
    await expect(repo.create(user)).resolves.toEqual(user);

    db.queueResults(user);
    await expect(repo.create(user, db as never)).resolves.toEqual(user);

    const updated = { ...user, firstName: "Updated" };
    db.queueResults(updated);
    await expect(repo.update(user.userId, { firstName: "Updated" })).resolves.toEqual(updated);

    db.queueResults(updated);
    await expect(repo.update(user.userId, { firstName: "Updated" }, db as never)).resolves.toEqual(
      updated
    );
  });

  it("softDelete marks user inactive", async () => {
    const inactive = { ...user, status: "Inactive" as const };
    db.queueResults(inactive);
    await expect(repo.softDelete(user.userId)).resolves.toEqual(inactive);
  });

  it("setPlatforms replaces platform rows", async () => {
    db.queueResults([], []);
    await repo.setPlatforms(user.userId, [
      { platform: "automation", role: "Analyst" },
      { platform: "questionnaire", role: "Researcher" },
    ]);
    expect(db.delete).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled();

    db.queueResults([]);
    await repo.setPlatforms(user.userId, []);
    expect(db.delete).toHaveBeenCalled();
  });

  it("getPlatforms returns platform rows", async () => {
    const platforms = [{ userId: user.userId, platform: "automation", role: "Admin" }];
    db.queueResults(platforms);
    await expect(repo.getPlatforms(user.userId)).resolves.toEqual(platforms);
  });

  it("manages invitations", async () => {
    db.queueResults([invitation]);
    await expect(repo.getLatestInvitation(user.userId)).resolves.toEqual(invitation);

    db.queueResults([]);
    await repo.insertInvitation(invitation);
    expect(db.insert).toHaveBeenCalled();

    db.queueResults([]);
    await repo.cancelInvitations(user.userId);
    expect(db.update).toHaveBeenCalled();

    db.queueResults([]);
    await repo.insertInvitation(invitation, db as never);
    await repo.cancelInvitations(user.userId, db as never);
  });
});
