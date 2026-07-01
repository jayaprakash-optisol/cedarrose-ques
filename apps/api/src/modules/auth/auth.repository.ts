import { eq, and } from "drizzle-orm";
import type { DrizzleDB } from "../../config/database.js";
import { users } from "../../db/schema/users.js";
import { refreshTokens, passwordResetTokens, userInvitations } from "../../db/schema/refresh-tokens.js";
import { normalizeEmail } from "../../shared/utils/email.js";

export class AuthRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findByEmail(email: string) {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, normalizeEmail(email)))
      .limit(1);
    return row ?? null;
  }

  async findById(userId: string) {
    const [row] = await this.db.select().from(users).where(eq(users.userId, userId)).limit(1);
    return row ?? null;
  }

  async updatePassword(userId: string, password: string) {
    await this.db
      .update(users)
      .set({ password, updatedAt: new Date() })
      .where(eq(users.userId, userId));
  }

  async insertRefreshToken(data: typeof refreshTokens.$inferInsert) {
    const [row] = await this.db.insert(refreshTokens).values(data).returning();
    return row;
  }

  async findRefreshToken(token: string) {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.token, token), eq(refreshTokens.isRevoked, false)))
      .limit(1);
    return row ?? null;
  }

  async revokeRefreshToken(token: string) {
    await this.db.update(refreshTokens).set({ isRevoked: true }).where(eq(refreshTokens.token, token));
  }

  async revokeAllUserRefreshTokens(userId: string) {
    await this.db.update(refreshTokens).set({ isRevoked: true }).where(eq(refreshTokens.userId, userId));
  }

  async insertPasswordResetToken(data: typeof passwordResetTokens.$inferInsert) {
    await this.db.insert(passwordResetTokens).values(data);
  }

  async invalidateUnusedPasswordResetTokens(userId: string) {
    await this.db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(and(eq(passwordResetTokens.userId, userId), eq(passwordResetTokens.used, false)));
  }

  async findPasswordResetToken(token: string) {
    const [row] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
    return row ?? null;
  }

  async markResetTokenUsed(token: string) {
    await this.db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.token, token));
  }

  async deletePasswordResetToken(token: string) {
    await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
  }

  async findActiveInvitation(token: string) {
    const [row] = await this.db
      .select()
      .from(userInvitations)
      .where(and(eq(userInvitations.token, token), eq(userInvitations.used, false)))
      .limit(1);
    return row ?? null;
  }

  async insertInvitation(data: typeof userInvitations.$inferInsert) {
    await this.db.insert(userInvitations).values(data);
  }

  async markInvitationUsed(token: string) {
    await this.db.update(userInvitations).set({ used: true }).where(eq(userInvitations.token, token));
  }

  async updateInvitationResent(token: string) {
    await this.db
      .update(userInvitations)
      .set({ lastResentAt: new Date() })
      .where(eq(userInvitations.token, token));
  }

  async activateUser(userId: string, password: string) {
    await this.db
      .update(users)
      .set({ password, status: "Active", updatedAt: new Date() })
      .where(eq(users.userId, userId));
  }

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
    },
  ) {
    const initials =
      data.firstName !== undefined || data.lastName !== undefined
        ? await (async () => {
            const user = await this.findById(userId);
            if (!user) return undefined;
            const first = data.firstName ?? user.firstName;
            const last = data.lastName ?? user.lastName;
            return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || undefined;
          })()
        : undefined;

    const [row] = await this.db
      .update(users)
      .set({
        ...data,
        ...(initials ? { initials } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.userId, userId))
      .returning();
    return row ?? null;
  }
}
