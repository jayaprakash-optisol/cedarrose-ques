import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthController } from "../../../../src/modules/auth/auth.controller.js";
import type { AuthService } from "../../../../src/modules/auth/auth.service.js";
import { createMockRequest, createMockResponse } from "../../../helpers/mock-express.js";
import { createMockUser } from "../../../helpers/mock-user.js";

vi.mock("../../../../src/middleware/rate-limit.js", () => ({
  setSecureCookie: vi.fn(),
  clearSecureCookie: vi.fn(),
}));

describe("AuthController", () => {
  let authService: AuthService;
  let controller: AuthController;
  let res: ReturnType<typeof createMockResponse>;

  const strippedUser = {
    userId: "11111111-1111-1111-1111-111111111111",
    email: "analyst@cedarrose.local",
    firstName: "Test",
    lastName: "Analyst",
    role: "Analyst",
    status: "Active",
  };

  beforeEach(() => {
    authService = {
      validateUser: vi.fn(),
      generateAccessToken: vi.fn().mockReturnValue("access-token"),
      generateRefreshToken: vi.fn().mockResolvedValue("refresh-token"),
      validateRefreshToken: vi.fn(),
      findById: vi.fn(),
      revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
      stripPassword: vi.fn().mockReturnValue(strippedUser),
      changePassword: vi.fn().mockResolvedValue(undefined),
      generateResetToken: vi.fn().mockResolvedValue(undefined),
      resetPassword: vi.fn().mockResolvedValue(undefined),
      verifyInvitation: vi.fn(),
      verifyResetToken: vi.fn().mockResolvedValue(undefined),
      completeRegistration: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthService;

    controller = new AuthController(authService);
    res = createMockResponse();
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("returns 401 for invalid credentials", async () => {
      vi.mocked(authService.validateUser).mockResolvedValue(null);
      const req = createMockRequest({
        body: { email: "bad@test.com", password: "wrong" },
      });

      await controller.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "AUTH_INVALID_CREDENTIALS" }),
        })
      );
    });

    it("returns user and token on success", async () => {
      const user = createMockUser();
      vi.mocked(authService.validateUser).mockResolvedValue(user);
      const req = createMockRequest({
        body: { email: user.email, password: "Password123" },
      });

      await controller.login(req, res);

      expect(authService.generateAccessToken).toHaveBeenCalledWith(user);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ token: "access-token", user: strippedUser }),
        })
      );
    });

    it("issues refresh token when rememberMe is true", async () => {
      const user = createMockUser();
      vi.mocked(authService.validateUser).mockResolvedValue(user);
      const req = createMockRequest({
        body: { email: user.email, password: "Password123", rememberMe: true },
      });

      await controller.login(req, res);

      expect(authService.generateRefreshToken).toHaveBeenCalledWith(user.userId);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ refreshToken: "refresh-token" }),
        })
      );
    });
  });

  describe("refreshToken", () => {
    it("returns 400 when refresh token is missing", async () => {
      const req = createMockRequest({ cookies: {}, body: {} });

      await controller.refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ message: "Refresh token is required" }) })
      );
    });

    it("returns 401 for invalid refresh token", async () => {
      vi.mocked(authService.validateRefreshToken).mockResolvedValue(null);
      const req = createMockRequest({ cookies: { refresh_token: "bad" } });

      await controller.refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 404 when user is not found", async () => {
      vi.mocked(authService.validateRefreshToken).mockResolvedValue({ userId: "missing" });
      vi.mocked(authService.findById).mockResolvedValue(null);
      const req = createMockRequest({ cookies: { refresh_token: "valid" } });

      await controller.refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("rotates tokens on success", async () => {
      const user = createMockUser();
      vi.mocked(authService.validateRefreshToken).mockResolvedValue({ userId: user.userId });
      vi.mocked(authService.findById).mockResolvedValue(user);
      const req = createMockRequest({ cookies: { refresh_token: "old-refresh" } });

      await controller.refreshToken(req, res);

      expect(authService.revokeRefreshToken).toHaveBeenCalledWith("old-refresh");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            token: "access-token",
            refreshToken: "refresh-token",
            user: strippedUser,
          }),
        })
      );
    });
  });

  describe("logout", () => {
    it("clears cookies and returns success", async () => {
      const req = createMockRequest({ cookies: { refresh_token: "rt" } });

      await controller.logout(req, res);

      expect(authService.revokeRefreshToken).toHaveBeenCalledWith("rt");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: "Logout successful" })
      );
    });
  });

  describe("me", () => {
    it("returns 401 when not authenticated", async () => {
      const req = createMockRequest({ user: undefined });

      await controller.me(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns stripped user profile", async () => {
      const user = createMockUser();
      const req = createMockRequest({ user });

      await controller.me(req, res);

      expect(authService.stripPassword).toHaveBeenCalledWith(user);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: strippedUser })
      );
    });
  });

  describe("changePassword", () => {
    it("returns 401 when not authenticated", async () => {
      const req = createMockRequest({ user: undefined, body: {} });

      await controller.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 when fields are missing", async () => {
      const req = createMockRequest({ body: { currentPassword: "old" } });

      await controller.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ message: "All fields are required" }) })
      );
    });

    it("returns 400 when passwords do not match", async () => {
      const req = createMockRequest({
        body: {
          currentPassword: "old",
          newPassword: "new1",
          confirmPassword: "new2",
        },
      });

      await controller.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: "New password and confirm password do not match" }),
        })
      );
    });

    it("changes password and returns success", async () => {
      const user = createMockUser();
      const req = createMockRequest({
        user,
        body: {
          currentPassword: "old",
          newPassword: "new",
          confirmPassword: "new",
        },
      });

      await controller.changePassword(req, res);

      expect(authService.changePassword).toHaveBeenCalledWith(user.userId, "old", "new");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { message: "Password changed successfully. Please log in again." },
        })
      );
    });
  });

  describe("forgotPassword", () => {
    it("always returns success message", async () => {
      const req = createMockRequest({ body: { email: "user@test.com" } });

      await controller.forgotPassword(req, res);

      expect(authService.generateResetToken).toHaveBeenCalledWith("user@test.com");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "If an account exists, a reset email has been sent" })
      );
    });
  });

  describe("resetPassword", () => {
    it("resets password and returns success", async () => {
      const req = createMockRequest({ body: { token: "reset-tok", newPassword: "NewPass1" } });

      await controller.resetPassword(req, res);

      expect(authService.resetPassword).toHaveBeenCalledWith("reset-tok", "NewPass1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Password reset successful" })
      );
    });
  });

  describe("verifyInvitation", () => {
    it("returns 400 when token is missing", async () => {
      const req = createMockRequest({ query: {} });

      await controller.verifyInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns invitation data on success", async () => {
      const data = { email: "invite@test.com" };
      vi.mocked(authService.verifyInvitation).mockResolvedValue(data);
      const req = createMockRequest({ query: { token: "inv-tok" } });

      await controller.verifyInvitation(req, res);

      expect(authService.verifyInvitation).toHaveBeenCalledWith("inv-tok");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data }));
    });
  });

  describe("verifyResetToken", () => {
    it("returns 400 when token is missing", async () => {
      const req = createMockRequest({ query: {} });

      await controller.verifyResetToken(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns valid true on success", async () => {
      const req = createMockRequest({ query: { token: "reset-tok" } });

      await controller.verifyResetToken(req, res);

      expect(authService.verifyResetToken).toHaveBeenCalledWith("reset-tok");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { valid: true } }));
    });
  });

  describe("completeRegistration", () => {
    it("completes registration and returns success", async () => {
      const req = createMockRequest({ body: { token: "inv-tok", password: "NewPass1" } });

      await controller.completeRegistration(req, res);

      expect(authService.completeRegistration).toHaveBeenCalledWith("inv-tok", "NewPass1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Registration complete" })
      );
    });
  });
});
