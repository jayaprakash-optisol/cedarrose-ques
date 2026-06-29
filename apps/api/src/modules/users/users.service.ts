import { randomBytes } from "node:crypto";
import { addHours } from "date-fns";
import type { DrizzleDB } from "../../config/database.js";
import type { UsersRepository } from "./users.repository.js";
import type { EmailService } from "../../lib/email-service.js";
import { hashPassword } from "../../shared/utils/crypto.js";
import { normalizeEmail } from "../../shared/utils/email.js";
import { AppError } from "../../shared/errors/AppError.js";

export class UsersService {
  constructor(
    private readonly db: DrizzleDB,
    private readonly usersRepo: UsersRepository,
    private readonly emailService: EmailService
  ) {}

  async list(filters: Parameters<UsersRepository["findAll"]>[0]) {
    const { data, total } = await this.usersRepo.findAll(filters);
    return {
      data: data.map(({ password: _p, ...u }) => u),
      total,
    };
  }

  async inviteUser(dto: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    platforms?: { platform: string; role: string }[];
  }) {
    const email = normalizeEmail(dto.email);
    const existing = await this.usersRepo.findByEmail(email);
    if (existing) throw new AppError(409, "VALIDATION_ERROR", "A user with this email already exists");

    const password = await hashPassword(randomBytes(10).toString("hex"));
    const initials = `${dto.firstName[0] ?? ""}${dto.lastName[0] ?? ""}`.toUpperCase();

    const user = await this.db.transaction(async (tx) => {
      const created = await this.usersRepo.create(
        {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email,
          role: dto.role,
          status: "Pending",
          password,
          initials,
        },
        tx
      );

      if (dto.platforms?.length) {
        await this.usersRepo.setPlatforms(created.userId, dto.platforms, tx);
      }

      const token = randomBytes(32).toString("hex");
      const expiresAt = addHours(new Date(), 24);
      await this.usersRepo.insertInvitation(
        { userId: created.userId, token, expiresAt, used: false },
        tx
      );

      await this.emailService.sendInvitationEmail(
        { firstName: created.firstName, email: created.email },
        token
      );

      return created;
    });

    const { password: _p, ...safe } = user;
    return safe;
  }

  async updateUser(userId: string, dto: {
    firstName?: string;
    lastName?: string;
    role?: string;
    status?: string;
    title?: string;
    platforms?: { platform: string; role: string }[];
  }) {
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");

    const updated = await this.usersRepo.update(userId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      status: dto.status,
      title: dto.title,
    });

    if (dto.platforms) await this.usersRepo.setPlatforms(userId, dto.platforms);

    const { password: _p, ...safe } = updated;
    return safe;
  }

  async deactivate(userId: string) {
    return this.usersRepo.softDelete(userId);
  }

  async resendInvitation(userId: string) {
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
    if (user.status !== "Pending") {
      throw new AppError(400, "VALIDATION_ERROR", "User is not pending invitation");
    }

    const existing = await this.usersRepo.getLatestInvitation(userId);
    if (existing?.lastResentAt) {
      const diff = Date.now() - existing.lastResentAt.getTime();
      if (diff < 5 * 60 * 1000) {
        throw new AppError(429, "VALIDATION_ERROR", "Please wait 5 minutes before resending");
      }
    }

    await this.db.transaction(async (tx) => {
      await this.usersRepo.cancelInvitations(userId, tx);

      const token = randomBytes(32).toString("hex");
      const expiresAt = addHours(new Date(), 24);
      await this.usersRepo.insertInvitation(
        {
          userId,
          token,
          expiresAt,
          used: false,
          lastResentAt: new Date(),
        },
        tx
      );

      await this.emailService.sendInvitationEmail(
        { firstName: user.firstName, email: user.email },
        token
      );
    });
  }

  async cancelInvitation(userId: string) {
    await this.usersRepo.cancelInvitations(userId);
    await this.usersRepo.update(userId, { status: "Inactive" });
  }

  async exportAll() {
    const { data } = await this.usersRepo.findAll({ offset: 0, limit: 10000 });
    return data.map(({ password: _p, ...u }) => u);
  }
}
