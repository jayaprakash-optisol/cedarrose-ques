import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { addDays, addHours } from "date-fns";
import { randomBytes } from "node:crypto";
import type { AuthRepository } from "./auth.repository.js";
import type {
  NotificationPreferences,
  UserNotificationPreferencesRepository,
} from "./user-notification-preferences.repository.js";
import type { EmailService } from "../../lib/email-service.js";
import { env } from "../../config/env.js";
import { hashPassword, verifyPassword } from "../../shared/utils/crypto.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { UserRow } from "../../db/schema/users.js";

export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly notificationPreferencesRepo: UserNotificationPreferencesRepository,
    private readonly emailService: EmailService,
  ) {}

  generateAccessToken(user: UserRow): string {
    return jwt.sign(
      {
        sub: user.userId,
        email: user.email,
        role: user.role,
        iss: env.jwtIssuer,
        aud: env.jwtAudience,
      },
      env.jwtAccessPrivateKey,
      {
        algorithm: env.jwtAlgorithm,
        expiresIn: env.jwtAccessTokenExpiry,
        jwtid: uuidv4(),
      } as jwt.SignOptions
    );
  }

  async validateUser(email: string, password: string): Promise<UserRow | null> {
    const user = await this.authRepo.findByEmail(email);
    if (!user) return null;

    if (user.status === "Inactive") {
      throw new AppError(403, "ACCOUNT_DISABLED", "Your account has been disabled. Please contact an administrator.");
    }

    const valid = await verifyPassword(password, user.password);
    return valid ? user : null;
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const rawToken = uuidv4();
    const expiresAt = addDays(new Date(), env.jwtRefreshTokenDays);
    await this.authRepo.insertRefreshToken({
      userId,
      token: rawToken,
      isRevoked: false,
      expiresAt,
    });
    return rawToken;
  }

  async validateRefreshToken(token: string) {
    const row = await this.authRepo.findRefreshToken(token);
    if (!row) return null;
    if (new Date() > row.expiresAt) {
      await this.authRepo.revokeRefreshToken(token);
      return null;
    }
    return { userId: row.userId };
  }

  async revokeRefreshToken(token: string) {
    await this.authRepo.revokeRefreshToken(token);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.authRepo.findById(userId);
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");

    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) throw new AppError(400, "VALIDATION_ERROR", "Current password is incorrect");

    const same = await verifyPassword(newPassword, user.password);
    if (same) throw new AppError(400, "VALIDATION_ERROR", "New password cannot be the same as your current password");

    await this.authRepo.updatePassword(userId, await hashPassword(newPassword));
    await this.authRepo.revokeAllUserRefreshTokens(userId);
  }

  async generateResetToken(email: string) {
    const user = await this.authRepo.findByEmail(email);
    if (!user) return;
    if (user.status === "Pending" || user.status === "Inactive") return;

    const token = randomBytes(32).toString("hex");
    const expiresAt = addHours(new Date(), 1);
    await this.authRepo.invalidateUnusedPasswordResetTokens(user.userId);
    await this.authRepo.insertPasswordResetToken({ userId: user.userId, token, expiresAt, used: false });

    try {
      await this.emailService.sendPasswordResetEmail(user.email, token);
    } catch {
      await this.authRepo.deletePasswordResetToken(token);
      throw new AppError(500, "INTERNAL_SERVER_ERROR", "Error sending reset email");
    }
  }

  async verifyResetToken(token: string) {
    const resetToken = await this.authRepo.findPasswordResetToken(token);
    if (!resetToken) throw new AppError(400, "VALIDATION_ERROR", "Invalid or expired reset token");
    if (resetToken.used) throw new AppError(400, "VALIDATION_ERROR", "This reset token has already been used");
    if (new Date() > resetToken.expiresAt) throw new AppError(400, "VALIDATION_ERROR", "Reset token has expired");
  }

  async resetPassword(token: string, newPassword: string) {
    const resetToken = await this.authRepo.findPasswordResetToken(token);
    if (!resetToken) throw new AppError(400, "VALIDATION_ERROR", "Invalid or expired reset token");
    if (resetToken.used) throw new AppError(400, "VALIDATION_ERROR", "This reset token has already been used");
    if (new Date() > resetToken.expiresAt) throw new AppError(400, "VALIDATION_ERROR", "Reset token has expired");

    const user = await this.authRepo.findById(resetToken.userId);
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");

    const same = await verifyPassword(newPassword, user.password);
    if (same) throw new AppError(400, "VALIDATION_ERROR", "New password cannot be the same as your current password");

    await this.authRepo.updatePassword(user.userId, await hashPassword(newPassword));
    await this.authRepo.markResetTokenUsed(token);
    await this.authRepo.revokeAllUserRefreshTokens(user.userId);
  }

  async verifyInvitation(token: string) {
    const invitation = await this.authRepo.findActiveInvitation(token);
    if (!invitation || new Date() > invitation.expiresAt) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid or expired invitation");
    }
    const user = await this.authRepo.findById(invitation.userId);
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
    return { firstName: user.firstName, lastName: user.lastName, role: user.role, email: user.email };
  }

  async completeRegistration(token: string, password: string) {
    const invitation = await this.authRepo.findActiveInvitation(token);
    if (!invitation || new Date() > invitation.expiresAt) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid or expired invitation");
    }
    await this.authRepo.activateUser(invitation.userId, await hashPassword(password));
    await this.authRepo.markInvitationUsed(token);
  }

  stripPassword<T extends { password?: string }>(user: T) {
    const { password: _pw, ...safe } = user;
    return safe;
  }

  async toMeResponse(user: UserRow) {
    const preferences = await this.notificationPreferencesRepo.findByUserId(user.userId);
    return { ...this.stripPassword(user), ...preferences };
  }

  async updateMe(
    userId: string,
    dto: {
      firstName?: string;
      lastName?: string;
      notifyOnSubmission?: boolean;
      notifyOnLinkExpiry?: boolean;
      notifyOnBlockedDispatch?: boolean;
      notifyOnRemindersSent?: boolean;
    },
  ) {
    const user = await this.authRepo.findById(userId);
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");

    const {
      firstName,
      lastName,
      notifyOnSubmission,
      notifyOnLinkExpiry,
      notifyOnBlockedDispatch,
      notifyOnRemindersSent,
    } = dto;

    let updated = user;
    if (firstName !== undefined || lastName !== undefined) {
      const row = await this.authRepo.updateProfile(userId, { firstName, lastName });
      if (!row) throw new AppError(404, "NOT_FOUND", "User not found");
      updated = row;
    }

    const preferenceUpdates: Partial<NotificationPreferences> = {};
    if (notifyOnSubmission !== undefined) preferenceUpdates.notifyOnSubmission = notifyOnSubmission;
    if (notifyOnLinkExpiry !== undefined) preferenceUpdates.notifyOnLinkExpiry = notifyOnLinkExpiry;
    if (notifyOnBlockedDispatch !== undefined) {
      preferenceUpdates.notifyOnBlockedDispatch = notifyOnBlockedDispatch;
    }
    if (notifyOnRemindersSent !== undefined) {
      preferenceUpdates.notifyOnRemindersSent = notifyOnRemindersSent;
    }

    const preferences =
      Object.keys(preferenceUpdates).length > 0
        ? await this.notificationPreferencesRepo.upsert(userId, preferenceUpdates)
        : await this.notificationPreferencesRepo.findByUserId(userId);

    return { ...this.stripPassword(updated), ...preferences };
  }

  async findById(userId: string) {
    return this.authRepo.findById(userId);
  }
}
