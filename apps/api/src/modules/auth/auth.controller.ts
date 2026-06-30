import type { Request, Response } from "express";
import type { AuthService } from "./auth.service.js";
import {
  setSecureCookie,
  clearSecureCookie,
} from "../../middleware/rate-limit.js";
import { sendSuccess, sendError } from "../../shared/utils/response.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response) => {
    const { email, password, rememberMe } = req.body as {
      email: string;
      password: string;
      rememberMe?: boolean;
    };

    const user = await this.authService.validateUser(email, password);
    if (!user) {
      return sendError(res, 401, "Invalid email or password", "AUTH_INVALID_CREDENTIALS");
    }

    const token = this.authService.generateAccessToken(user);
    setSecureCookie(req, res, token);

    let refreshToken: string | undefined;
    if (rememberMe) {
      refreshToken = await this.authService.generateRefreshToken(user.userId);
      setSecureCookie(req, res, refreshToken, "refresh_token", 30 * 24 * 60 * 60 * 1000);
    }

    sendSuccess(res, {
      user: this.authService.stripPassword(user),
      token,
      ...(refreshToken && { refreshToken }),
    });
  };

  refreshToken = async (req: Request, res: Response) => {
    const token = (req.cookies?.refresh_token ?? req.body.refreshToken) as string | undefined;
    if (!token) return sendError(res, 400, "Refresh token is required");

    const data = await this.authService.validateRefreshToken(token);
    if (!data) {
      clearSecureCookie(res, "access_token");
      clearSecureCookie(res, "refresh_token");
      return sendError(res, 401, "Invalid or expired refresh token");
    }

    const user = await this.authService.findById(data.userId);
    if (!user) {
      clearSecureCookie(res, "access_token");
      clearSecureCookie(res, "refresh_token");
      return sendError(res, 404, "User not found");
    }

    const newToken = this.authService.generateAccessToken(user);
    const newRefreshToken = await this.authService.generateRefreshToken(user.userId);
    await this.authService.revokeRefreshToken(token);

    setSecureCookie(req, res, newToken);
    setSecureCookie(req, res, newRefreshToken, "refresh_token", 30 * 24 * 60 * 60 * 1000);

    sendSuccess(res, {
      user: this.authService.stripPassword(user),
      token: newToken,
      refreshToken: newRefreshToken,
    });
  };

  logout = async (req: Request, res: Response) => {
    const token = (req.cookies?.refresh_token ?? req.body.refreshToken) as string | undefined;
    if (token) await this.authService.revokeRefreshToken(token);
    clearSecureCookie(res, "access_token");
    clearSecureCookie(res, "refresh_token");
    sendSuccess(res, null, 200, "Logout successful");
  };

  me = async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 401, "Not authenticated");
    sendSuccess(res, this.authService.stripPassword(req.user));
  };

  changePassword = async (req: Request, res: Response) => {
    const { currentPassword, newPassword, confirmPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    };

    if (!req.user) return sendError(res, 401, "Not authenticated");
    if (!currentPassword || !newPassword || !confirmPassword) {
      return sendError(res, 400, "All fields are required");
    }
    if (newPassword !== confirmPassword) {
      return sendError(res, 400, "New password and confirm password do not match");
    }

    await this.authService.changePassword(req.user.userId, currentPassword, newPassword);
    clearSecureCookie(res, "access_token");
    clearSecureCookie(res, "refresh_token");
    sendSuccess(res, { message: "Password changed successfully. Please log in again." });
  };

  forgotPassword = async (req: Request, res: Response) => {
    await this.authService.generateResetToken(req.body.email);
    sendSuccess(res, null, 200, "If an account exists, a reset email has been sent");
  };

  resetPassword = async (req: Request, res: Response) => {
    const { token, newPassword } = req.body as { token: string; newPassword: string };
    await this.authService.resetPassword(token, newPassword);
    sendSuccess(res, null, 200, "Password reset successful");
  };

  verifyInvitation = async (req: Request, res: Response) => {
    const token = req.query.token as string;
    if (!token) return sendError(res, 400, "Token is required");
    const data = await this.authService.verifyInvitation(token);
    sendSuccess(res, data);
  };

  verifyResetToken = async (req: Request, res: Response) => {
    const token = req.query.token as string;
    if (!token) return sendError(res, 400, "Token is required");
    await this.authService.verifyResetToken(token);
    sendSuccess(res, { valid: true });
  };

  completeRegistration = async (req: Request, res: Response) => {
    const { token, password } = req.body as { token: string; password: string };
    await this.authService.completeRegistration(token, password);
    sendSuccess(res, null, 200, "Registration complete");
  };
}
