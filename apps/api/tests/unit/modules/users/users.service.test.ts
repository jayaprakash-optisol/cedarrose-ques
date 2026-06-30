import { describe, it, expect, beforeEach, vi } from "vitest";
import { subMinutes } from "date-fns";
import { UsersService } from "../../../../src/modules/users/users.service.js";
import type { UsersRepository } from "../../../../src/modules/users/users.repository.js";
import { createMockUsersRepository } from "../../../helpers/mock-repositories.js";
import { createMockEmailService } from "../../../helpers/mock-email-service.js";
import { createMockDb } from "../../../helpers/mock-services.js";
import { createMockUser } from "../../../helpers/mock-user.js";

describe("UsersService", () => {
  let db: ReturnType<typeof createMockDb>;
  let repo: ReturnType<typeof createMockUsersRepository>;
  let email: ReturnType<typeof createMockEmailService>;
  let service: UsersService;

  beforeEach(() => {
    db = createMockDb();
    repo = createMockUsersRepository();
    email = createMockEmailService();
    service = new UsersService(db as never, repo as unknown as UsersRepository, email);
  });

  describe("list", () => {
    it("strips passwords from user rows", async () => {
      const user = createMockUser();
      vi.mocked(repo.findAll).mockResolvedValue({ data: [user], total: 1 });

      const result = await service.list({ offset: 0, limit: 20 });

      expect(result.data[0]).not.toHaveProperty("password");
      expect(result.data[0].email).toBe(user.email);
      expect(result.total).toBe(1);
    });
  });

  describe("inviteUser", () => {
    it("rejects duplicate email", async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue(createMockUser());

      await expect(
        service.inviteUser({
          firstName: "New",
          lastName: "User",
          email: "analyst@cedarrose.local",
          role: "Analyst",
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "A user with this email already exists",
      });
    });

    it("creates pending user, invitation, and sends email", async () => {
      const created = createMockUser({ status: "Pending" });
      vi.mocked(repo.findByEmail).mockResolvedValue(null);
      vi.mocked(repo.create).mockResolvedValue(created);

      const result = await service.inviteUser({
        firstName: "New",
        lastName: "User",
        email: "new.user@test.com",
        role: "Researcher",
        platforms: [{ platform: "OpsHub", role: "Researcher" }],
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "new.user@test.com",
          status: "Pending",
          initials: "NU",
        }),
        expect.anything(),
      );
      expect(repo.setPlatforms).toHaveBeenCalledWith(
        created.userId,
        [{ platform: "OpsHub", role: "Researcher" }],
        expect.anything(),
      );
      expect(repo.insertInvitation).toHaveBeenCalledOnce();
      expect(email.sendInvitationEmail).toHaveBeenCalledOnce();
      expect(result).not.toHaveProperty("password");
    });

    it("skips platform assignment when platforms are omitted", async () => {
      const created = createMockUser({ status: "Pending" });
      vi.mocked(repo.findByEmail).mockResolvedValue(null);
      vi.mocked(repo.create).mockResolvedValue(created);

      await service.inviteUser({
        firstName: "Solo",
        lastName: "User",
        email: "solo@test.com",
        role: "Analyst",
      });

      expect(repo.setPlatforms).not.toHaveBeenCalled();
    });
  });

  describe("updateUser", () => {
    it("throws when user is missing", async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);
      await expect(service.updateUser("missing", { firstName: "X" })).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("updates user and optional platforms", async () => {
      const user = createMockUser();
      const updated = { ...user, firstName: "Updated" };
      vi.mocked(repo.findById).mockResolvedValue(user);
      vi.mocked(repo.update).mockResolvedValue(updated);

      const result = await service.updateUser(user.userId, {
        firstName: "Updated",
        platforms: [{ platform: "OpsHub", role: "Admin" }],
      });

      expect(repo.setPlatforms).toHaveBeenCalledWith(user.userId, [
        { platform: "OpsHub", role: "Admin" },
      ]);
      expect(result.firstName).toBe("Updated");
      expect(result).not.toHaveProperty("password");
    });

    it("updates user without touching platforms when omitted", async () => {
      const user = createMockUser();
      const updated = { ...user, title: "Lead" };
      vi.mocked(repo.findById).mockResolvedValue(user);
      vi.mocked(repo.update).mockResolvedValue(updated);

      await service.updateUser(user.userId, { title: "Lead" });

      expect(repo.setPlatforms).not.toHaveBeenCalled();
    });
  });

  describe("deactivate", () => {
    it("soft deletes user", async () => {
      vi.mocked(repo.softDelete).mockResolvedValue(createMockUser({ status: "Inactive" }));
      await service.deactivate("user-id");
      expect(repo.softDelete).toHaveBeenCalledWith("user-id");
    });
  });

  describe("resendInvitation", () => {
    it("rejects missing users", async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);
      await expect(service.resendInvitation("missing")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("rejects non-pending users", async () => {
      vi.mocked(repo.findById).mockResolvedValue(createMockUser({ status: "Active" }));
      await expect(service.resendInvitation("user-id")).rejects.toMatchObject({
        message: "User is not pending invitation",
      });
    });

    it("enforces 5-minute cooldown between resends", async () => {
      const user = createMockUser({ status: "Pending" });
      vi.mocked(repo.findById).mockResolvedValue(user);
      vi.mocked(repo.getLatestInvitation).mockResolvedValue({
        id: "inv",
        userId: user.userId,
        token: "old",
        expiresAt: new Date(),
        used: false,
        lastResentAt: subMinutes(new Date(), 2),
        createdAt: new Date(),
      });

      await expect(service.resendInvitation(user.userId)).rejects.toMatchObject({
        statusCode: 429,
        message: "Please wait 5 minutes before resending",
      });
    });

    it("cancels old invitations and sends a new one", async () => {
      const user = createMockUser({ status: "Pending" });
      vi.mocked(repo.findById).mockResolvedValue(user);
      vi.mocked(repo.getLatestInvitation).mockResolvedValue(null);

      await service.resendInvitation(user.userId);

      expect(repo.cancelInvitations).toHaveBeenCalledWith(user.userId, expect.anything());
      expect(repo.insertInvitation).toHaveBeenCalledOnce();
      expect(email.sendInvitationEmail).toHaveBeenCalledOnce();
    });

    it("allows resend after cooldown has elapsed", async () => {
      const user = createMockUser({ status: "Pending" });
      vi.mocked(repo.findById).mockResolvedValue(user);
      vi.mocked(repo.getLatestInvitation).mockResolvedValue({
        id: "inv",
        userId: user.userId,
        token: "old",
        expiresAt: new Date(),
        used: false,
        lastResentAt: subMinutes(new Date(), 10),
        createdAt: new Date(),
      });

      await service.resendInvitation(user.userId);

      expect(email.sendInvitationEmail).toHaveBeenCalledOnce();
    });
  });

  describe("cancelInvitation", () => {
    it("cancels invitations and marks user inactive", async () => {
      await service.cancelInvitation("user-id");
      expect(repo.cancelInvitations).toHaveBeenCalledWith("user-id");
      expect(repo.update).toHaveBeenCalledWith("user-id", { status: "Inactive" });
    });
  });

  describe("exportAll", () => {
    it("returns users without passwords", async () => {
      const user = createMockUser();
      vi.mocked(repo.findAll).mockResolvedValue({ data: [user], total: 1 });
      const result = await service.exportAll();
      expect(result[0]).not.toHaveProperty("password");
    });
  });
});
