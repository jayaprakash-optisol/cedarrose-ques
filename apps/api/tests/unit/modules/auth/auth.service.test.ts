import { describe, it, expect, beforeEach, vi } from "vitest";
import { addDays, addHours, subHours } from "date-fns";
import jwt from "jsonwebtoken";
import { AuthService } from "../../../../src/modules/auth/auth.service.js";
import { AppError } from "../../../../src/shared/errors/AppError.js";
import { hashPassword } from "../../../../src/shared/utils/crypto.js";
import { env } from "../../../../src/config/env.js";
import { createMockAuthRepository } from "../../../helpers/mock-auth-repository.js";
import { createMockEmailService } from "../../../helpers/mock-email-service.js";
import { createMockUser } from "../../../helpers/mock-user.js";

describe("AuthService", () => {
  let repo: ReturnType<typeof createMockAuthRepository>;
  let email: ReturnType<typeof createMockEmailService>;
  let service: AuthService;

  beforeEach(() => {
    repo = createMockAuthRepository();
    email = createMockEmailService();
    service = new AuthService(repo, email);
  });

  describe("validateUser", () => {
    it("returns null when email is unknown", async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue(null as never);
      await expect(service.validateUser("unknown@test.com", "pass")).resolves.toBeNull();
    });

    it("throws when account is inactive", async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue(createMockUser({ status: "Inactive" }));
      await expect(service.validateUser("analyst@cedarrose.local", "pass")).rejects.toMatchObject({
        statusCode: 403,
        code: "ACCOUNT_DISABLED",
      });
    });

    it("returns null for invalid password", async () => {
      const user = createMockUser({ password: await hashPassword("CorrectPass1") });
      vi.mocked(repo.findByEmail).mockResolvedValue(user);
      await expect(service.validateUser(user.email, "WrongPass1")).resolves.toBeNull();
    });

    it("returns user for valid credentials", async () => {
      const user = createMockUser({ password: await hashPassword("ValidPass1") });
      vi.mocked(repo.findByEmail).mockResolvedValue(user);
      await expect(service.validateUser(user.email, "ValidPass1")).resolves.toEqual(user);
    });
  });

  describe("generateResetToken", () => {
    it("does nothing for unknown email (no enumeration)", async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue(null as never);
      await service.generateResetToken("missing@test.com");
      expect(repo.insertPasswordResetToken).not.toHaveBeenCalled();
      expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it("does nothing for pending or inactive users", async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue(createMockUser({ status: "Pending" }));
      await service.generateResetToken("pending@test.com");
      expect(repo.insertPasswordResetToken).not.toHaveBeenCalled();
    });

    it("invalidates previous tokens before creating a new one", async () => {
      const user = createMockUser();
      vi.mocked(repo.findByEmail).mockResolvedValue(user);

      await service.generateResetToken(user.email);

      expect(repo.invalidateUnusedPasswordResetTokens).toHaveBeenCalledWith(user.userId);
      expect(repo.insertPasswordResetToken).toHaveBeenCalledOnce();
      expect(email.sendPasswordResetEmail).toHaveBeenCalledOnce();
    });

    it("deletes token when email delivery fails", async () => {
      const user = createMockUser();
      vi.mocked(repo.findByEmail).mockResolvedValue(user);
      vi.mocked(email.sendPasswordResetEmail).mockRejectedValue(new Error("smtp down"));

      await expect(service.generateResetToken(user.email)).rejects.toMatchObject({
        statusCode: 500,
      });
      expect(repo.deletePasswordResetToken).toHaveBeenCalledOnce();
    });
  });

  describe("verifyResetToken", () => {
    it("rejects missing tokens", async () => {
      vi.mocked(repo.findPasswordResetToken).mockResolvedValue(null as never);
      await expect(service.verifyResetToken("bad")).rejects.toMatchObject({
        message: "Invalid or expired reset token",
      });
    });

    it("rejects already used tokens", async () => {
      vi.mocked(repo.findPasswordResetToken).mockResolvedValue({
        id: "id",
        userId: "u",
        token: "t",
        used: true,
        expiresAt: addHours(new Date(), 1),
        createdAt: new Date(),
      });
      await expect(service.verifyResetToken("t")).rejects.toMatchObject({
        message: "This reset token has already been used",
      });
    });

    it("rejects expired tokens", async () => {
      vi.mocked(repo.findPasswordResetToken).mockResolvedValue({
        id: "id",
        userId: "u",
        token: "t",
        used: false,
        expiresAt: subHours(new Date(), 1),
        createdAt: new Date(),
      });
      await expect(service.verifyResetToken("t")).rejects.toMatchObject({
        message: "Reset token has expired",
      });
    });

    it("accepts valid unused tokens", async () => {
      vi.mocked(repo.findPasswordResetToken).mockResolvedValue({
        id: "id",
        userId: "u",
        token: "t",
        used: false,
        expiresAt: addHours(new Date(), 1),
        createdAt: new Date(),
      });
      await expect(service.verifyResetToken("t")).resolves.toBeUndefined();
    });
  });

  describe("resetPassword", () => {
    const token = "reset-token";
    const userId = "11111111-1111-1111-1111-111111111111";

    it("rejects reused tokens", async () => {
      vi.mocked(repo.findPasswordResetToken).mockResolvedValue({
        id: "id",
        userId,
        token,
        used: true,
        expiresAt: addHours(new Date(), 1),
        createdAt: new Date(),
      });
      await expect(service.resetPassword(token, "NewPass123")).rejects.toBeInstanceOf(AppError);
    });

    it("rejects when new password matches current password", async () => {
      const currentHash = await hashPassword("SamePass12");
      vi.mocked(repo.findPasswordResetToken).mockResolvedValue({
        id: "id",
        userId,
        token,
        used: false,
        expiresAt: addHours(new Date(), 1),
        createdAt: new Date(),
      });
      vi.mocked(repo.findById).mockResolvedValue(createMockUser({ userId, password: currentHash }));

      await expect(service.resetPassword(token, "SamePass12")).rejects.toMatchObject({
        message: "New password cannot be the same as your current password",
      });
    });

    it("marks token used and revokes refresh tokens on success", async () => {
      const user = createMockUser({
        userId,
        password: await hashPassword("OldPass123"),
      });
      vi.mocked(repo.findPasswordResetToken).mockResolvedValue({
        id: "id",
        userId,
        token,
        used: false,
        expiresAt: addHours(new Date(), 1),
        createdAt: new Date(),
      });
      vi.mocked(repo.findById).mockResolvedValue(user);

      await service.resetPassword(token, "NewPass456");

      expect(repo.updatePassword).toHaveBeenCalledOnce();
      expect(repo.markResetTokenUsed).toHaveBeenCalledWith(token);
      expect(repo.revokeAllUserRefreshTokens).toHaveBeenCalledWith(userId);
    });
  });

  describe("changePassword", () => {
    it("rejects incorrect current password", async () => {
      const user = createMockUser({ password: await hashPassword("Current1") });
      vi.mocked(repo.findById).mockResolvedValue(user);

      await expect(service.changePassword(user.userId, "Wrong1", "NewPass123")).rejects.toMatchObject({
        message: "Current password is incorrect",
      });
    });

    it("revokes refresh tokens after successful change", async () => {
      const user = createMockUser({ password: await hashPassword("Current1") });
      vi.mocked(repo.findById).mockResolvedValue(user);

      await service.changePassword(user.userId, "Current1", "NewPass456");

      expect(repo.updatePassword).toHaveBeenCalledOnce();
      expect(repo.revokeAllUserRefreshTokens).toHaveBeenCalledWith(user.userId);
    });
  });

  describe("stripPassword", () => {
    it("removes password from user object", () => {
      const safe = service.stripPassword(createMockUser());
      expect(safe).not.toHaveProperty("password");
      expect(safe).toHaveProperty("email");
    });
  });

  describe("generateAccessToken", () => {
    it("issues a signed JWT with user claims", () => {
      const user = createMockUser();
      const token = service.generateAccessToken(user);
      const decoded = jwt.verify(token, env.jwtAccessPublicKey) as { sub: string; email: string; role: string };
      expect(decoded.sub).toBe(user.userId);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
    });
  });

  describe("refresh token lifecycle", () => {
    it("creates refresh token rows", async () => {
      vi.mocked(repo.insertRefreshToken).mockResolvedValue({
        id: "id",
        userId: "u",
        token: "raw",
        isRevoked: false,
        expiresAt: addDays(new Date(), 30),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const token = await service.generateRefreshToken("u");
      expect(token).toBeTruthy();
      expect(repo.insertRefreshToken).toHaveBeenCalledOnce();
    });

    it("returns null for unknown refresh token", async () => {
      vi.mocked(repo.findRefreshToken).mockResolvedValue(null as never);
      await expect(service.validateRefreshToken("missing")).resolves.toBeNull();
    });

    it("revokes expired refresh tokens", async () => {
      vi.mocked(repo.findRefreshToken).mockResolvedValue({
        id: "id",
        userId: "u",
        token: "expired",
        isRevoked: false,
        expiresAt: subHours(new Date(), 1),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.validateRefreshToken("expired")).resolves.toBeNull();
      expect(repo.revokeRefreshToken).toHaveBeenCalledWith("expired");
    });

    it("returns user id for valid refresh token", async () => {
      vi.mocked(repo.findRefreshToken).mockResolvedValue({
        id: "id",
        userId: "user-1",
        token: "valid",
        isRevoked: false,
        expiresAt: addHours(new Date(), 24),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.validateRefreshToken("valid")).resolves.toEqual({ userId: "user-1" });
    });
  });

  describe("invitation flow", () => {
    it("verifies active invitations", async () => {
      const user = createMockUser();
      vi.mocked(repo.findActiveInvitation).mockResolvedValue({
        id: "inv",
        userId: user.userId,
        token: "invite",
        expiresAt: addHours(new Date(), 24),
        used: false,
        lastResentAt: null,
        createdAt: new Date(),
      });
      vi.mocked(repo.findById).mockResolvedValue(user);

      await expect(service.verifyInvitation("invite")).resolves.toMatchObject({
        email: user.email,
        firstName: user.firstName,
      });
    });

    it("completes registration and marks invitation used", async () => {
      vi.mocked(repo.findActiveInvitation).mockResolvedValue({
        id: "inv",
        userId: "u",
        token: "invite",
        expiresAt: addHours(new Date(), 24),
        used: false,
        lastResentAt: null,
        createdAt: new Date(),
      });

      await service.completeRegistration("invite", "NewPass123");
      expect(repo.activateUser).toHaveBeenCalledOnce();
      expect(repo.markInvitationUsed).toHaveBeenCalledWith("invite");
    });

    it("rejects expired invitations", async () => {
      vi.mocked(repo.findActiveInvitation).mockResolvedValue({
        id: "inv",
        userId: "u",
        token: "invite",
        expiresAt: subHours(new Date(), 1),
        used: false,
        lastResentAt: null,
        createdAt: new Date(),
      });

      await expect(service.verifyInvitation("invite")).rejects.toMatchObject({
        message: "Invalid or expired invitation",
      });
      await expect(service.completeRegistration("invite", "NewPass123")).rejects.toMatchObject({
        message: "Invalid or expired invitation",
      });
    });

    it("rejects invitation when user is missing", async () => {
      vi.mocked(repo.findActiveInvitation).mockResolvedValue({
        id: "inv",
        userId: "u",
        token: "invite",
        expiresAt: addHours(new Date(), 24),
        used: false,
        lastResentAt: null,
        createdAt: new Date(),
      });
      vi.mocked(repo.findById).mockResolvedValue(null as never);

      await expect(service.verifyInvitation("invite")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("revokeRefreshToken", () => {
    it("delegates to repository", async () => {
      await service.revokeRefreshToken("token");
      expect(repo.revokeRefreshToken).toHaveBeenCalledWith("token");
    });
  });

  describe("findById", () => {
    it("delegates to repository", async () => {
      const user = createMockUser();
      vi.mocked(repo.findById).mockResolvedValue(user);
      await expect(service.findById(user.userId)).resolves.toEqual(user);
    });
  });

  describe("changePassword edge cases", () => {
    it("rejects when user is missing", async () => {
      vi.mocked(repo.findById).mockResolvedValue(null as never);
      await expect(service.changePassword("missing", "Current1", "NewPass123")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("rejects when new password matches current password", async () => {
      const user = createMockUser({ password: await hashPassword("SamePass12") });
      vi.mocked(repo.findById).mockResolvedValue(user);

      await expect(service.changePassword(user.userId, "SamePass12", "SamePass12")).rejects.toMatchObject({
        message: "New password cannot be the same as your current password",
      });
    });
  });

  describe("resetPassword edge cases", () => {
    it("rejects when user is missing", async () => {
      vi.mocked(repo.findPasswordResetToken).mockResolvedValue({
        id: "id",
        userId: "missing",
        token: "t",
        used: false,
        expiresAt: addHours(new Date(), 1),
        createdAt: new Date(),
      });
      vi.mocked(repo.findById).mockResolvedValue(null as never);

      await expect(service.resetPassword("t", "NewPass123")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("generateResetToken inactive user", () => {
    it("does nothing for inactive users", async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue(createMockUser({ status: "Inactive" }));
      await service.generateResetToken("inactive@test.com");
      expect(repo.insertPasswordResetToken).not.toHaveBeenCalled();
    });
  });
});
