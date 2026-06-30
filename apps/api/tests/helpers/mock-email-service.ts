import { vi } from "vitest";
import type { EmailService } from "../../src/lib/email-service.js";

export function createMockEmailService(): EmailService {
  return {
    sendEmail: vi.fn(),
    sendInvitationEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendQuestionnaireLink: vi.fn(),
    sendOtpEmail: vi.fn(),
  } as unknown as EmailService;
}
