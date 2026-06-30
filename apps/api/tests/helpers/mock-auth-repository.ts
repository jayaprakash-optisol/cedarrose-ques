import { vi } from "vitest";
import type { AuthRepository } from "../../src/modules/auth/auth.repository.js";

export function createMockAuthRepository(): AuthRepository {
  return {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    updatePassword: vi.fn(),
    insertRefreshToken: vi.fn(),
    findRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    revokeAllUserRefreshTokens: vi.fn(),
    insertPasswordResetToken: vi.fn(),
    invalidateUnusedPasswordResetTokens: vi.fn(),
    findPasswordResetToken: vi.fn(),
    markResetTokenUsed: vi.fn(),
    deletePasswordResetToken: vi.fn(),
    findActiveInvitation: vi.fn(),
    insertInvitation: vi.fn(),
    markInvitationUsed: vi.fn(),
    updateInvitationResent: vi.fn(),
    activateUser: vi.fn(),
  } as unknown as AuthRepository;
}
