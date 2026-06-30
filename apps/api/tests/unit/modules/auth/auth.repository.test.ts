import { describe, it, expect, beforeEach } from "vitest";
import { AuthRepository } from "../../../../src/modules/auth/auth.repository.js";
import { createMockDrizzle } from "../../../helpers/mock-drizzle.js";
import { createMockUser } from "../../../helpers/mock-user.js";

describe("AuthRepository", () => {
  let db: ReturnType<typeof createMockDrizzle>;
  let repo: AuthRepository;

  const user = createMockUser();
  const refreshRow = {
    id: "refresh-1",
    userId: user.userId,
    token: "refresh-token",
    isRevoked: false,
    expiresAt: new Date("2026-12-31T00:00:00.000Z"),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const resetRow = {
    id: "reset-1",
    userId: user.userId,
    token: "reset-token",
    used: false,
    expiresAt: new Date("2026-12-31T00:00:00.000Z"),
    createdAt: new Date(),
  };
  const invitationRow = {
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
    repo = new AuthRepository(db as never);
  });

  it("findByEmail returns row or null", async () => {
    db.queueResults([user]);
    await expect(repo.findByEmail(user.email)).resolves.toEqual(user);

    db.queueResults([]);
    await expect(repo.findByEmail("missing@test.com")).resolves.toBeNull();
  });

  it("findById returns row or null", async () => {
    db.queueResults([user]);
    await expect(repo.findById(user.userId)).resolves.toEqual(user);

    db.queueResults([]);
    await expect(repo.findById("missing")).resolves.toBeNull();
  });

  it("updatePassword updates user password", async () => {
    db.queueResults([]);
    await repo.updatePassword(user.userId, "hashed");
    expect(db.update).toHaveBeenCalled();
  });

  it("manages refresh tokens", async () => {
    db.queueResults(refreshRow);
    await expect(repo.insertRefreshToken(refreshRow)).resolves.toEqual(refreshRow);

    db.queueResults([refreshRow]);
    await expect(repo.findRefreshToken("refresh-token")).resolves.toEqual(refreshRow);

    db.queueResults([]);
    await expect(repo.findRefreshToken("missing")).resolves.toBeNull();

    db.queueResults([]);
    await repo.revokeRefreshToken("refresh-token");
    expect(db.update).toHaveBeenCalled();

    db.queueResults([]);
    await repo.revokeAllUserRefreshTokens(user.userId);
    expect(db.update).toHaveBeenCalled();
  });

  it("manages password reset tokens", async () => {
    db.queueResults([]);
    await repo.insertPasswordResetToken(resetRow);
    expect(db.insert).toHaveBeenCalled();

    db.queueResults([]);
    await repo.invalidateUnusedPasswordResetTokens(user.userId);
    expect(db.update).toHaveBeenCalled();

    db.queueResults([resetRow]);
    await expect(repo.findPasswordResetToken("reset-token")).resolves.toEqual(resetRow);

    db.queueResults([]);
    await repo.markResetTokenUsed("reset-token");
    expect(db.update).toHaveBeenCalled();

    db.queueResults([]);
    await repo.deletePasswordResetToken("reset-token");
    expect(db.delete).toHaveBeenCalled();
  });

  it("manages invitations and activation", async () => {
    db.queueResults([invitationRow]);
    await expect(repo.findActiveInvitation("invite-token")).resolves.toEqual(invitationRow);

    db.queueResults([]);
    await expect(repo.findActiveInvitation("missing")).resolves.toBeNull();

    db.queueResults([]);
    await repo.insertInvitation(invitationRow);
    expect(db.insert).toHaveBeenCalled();

    db.queueResults([]);
    await repo.markInvitationUsed("invite-token");
    expect(db.update).toHaveBeenCalled();

    db.queueResults([]);
    await repo.updateInvitationResent("invite-token");
    expect(db.update).toHaveBeenCalled();

    db.queueResults([]);
    await repo.activateUser(user.userId, "hashed");
    expect(db.update).toHaveBeenCalled();
  });
});
