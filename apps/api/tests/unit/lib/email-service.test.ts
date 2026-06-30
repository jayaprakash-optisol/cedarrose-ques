import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockBeginSend, mockPollUntilDone } = vi.hoisted(() => ({
  mockBeginSend: vi.fn(),
  mockPollUntilDone: vi.fn(),
}));

vi.mock("@azure/communication-email", () => ({
  EmailClient: vi.fn(function EmailClient(this: { beginSend: typeof mockBeginSend }) {
    this.beginSend = mockBeginSend;
  }),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import { EmailClient } from "@azure/communication-email";
import * as fs from "node:fs";
import { EmailService } from "../../../src/lib/email-service.js";
import { env } from "../../../src/config/env.js";
import { AppError } from "../../../src/shared/errors/AppError.js";

describe("EmailService", () => {
  const originalConnectionString = env.azureEmailConnectionString;
  const originalSender = env.azureEmailSender;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPollUntilDone.mockResolvedValue({ status: "Succeeded" });
    mockBeginSend.mockResolvedValue({ pollUntilDone: mockPollUntilDone });
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("<p>Hello {{firstName}}</p>");
    env.azureEmailConnectionString = "endpoint=https://test.communication.azure.com/;accesskey=test";
    env.azureEmailSender = "noreply@cedarrose.local";
  });

  afterEach(() => {
    env.azureEmailConnectionString = originalConnectionString;
    env.azureEmailSender = originalSender;
  });

  it("skips send when Azure is not configured", async () => {
    env.azureEmailConnectionString = "";
    env.azureEmailSender = "";
    const service = new EmailService();

    await service.sendEmail("user@test.com", "Subject", "invitation", { firstName: "Ada" });

    expect(mockBeginSend).not.toHaveBeenCalled();
  });

  it("renders fallback html when template file is missing", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const service = new EmailService();

    await service.sendEmail("user@test.com", "Subject", "missing", { foo: "bar" });

    expect(mockBeginSend).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          html: expect.stringContaining('"foo":"bar"'),
        }),
      })
    );
  });

  it("sends email via Azure when configured", async () => {
    const service = new EmailService();

    await service.sendEmail("user@test.com", "Welcome", "invitation", { firstName: "Ada" });

    expect(mockBeginSend).toHaveBeenCalledWith(
      expect.objectContaining({
        senderAddress: env.azureEmailSender,
        recipients: { to: [{ address: "user@test.com" }] },
        content: expect.objectContaining({ subject: "Welcome" }),
      })
    );
    expect(mockPollUntilDone).toHaveBeenCalled();
  });

  it("throws AppError when Azure send fails", async () => {
    mockBeginSend.mockRejectedValue(new Error("azure down"));
    const service = new EmailService();

    await expect(
      service.sendEmail("user@test.com", "Subject", "invitation", { firstName: "Ada" })
    ).rejects.toBeInstanceOf(AppError);
  });

  it("disables client when connection string is invalid", async () => {
    vi.mocked(EmailClient).mockImplementationOnce(function invalidClient() {
      throw new Error("invalid connection string");
    });
    const service = new EmailService();

    await service.sendEmail("user@test.com", "Subject", "invitation", { firstName: "Ada" });

    expect(mockBeginSend).not.toHaveBeenCalled();
  });

  it("sendInvitationEmail builds registration link", async () => {
    const service = new EmailService();
    await service.sendInvitationEmail({ firstName: "Ada", email: "ada@test.com" }, "invite-token");

    expect(mockBeginSend).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          subject: "You're invited to CedarRose OpsHub",
        }),
      })
    );
  });

  it("sendPasswordResetEmail builds reset link", async () => {
    const service = new EmailService();
    await service.sendPasswordResetEmail("ada@test.com", "reset-token");

    expect(mockBeginSend).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ subject: "Reset your password" }),
      })
    );
  });

  it("sendQuestionnaireLink uses subject name in subject line", async () => {
    const service = new EmailService();
    await service.sendQuestionnaireLink("ada@test.com", "Acme Corp", "https://example.com/q");

    expect(mockBeginSend).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ subject: "Questionnaire for Acme Corp" }),
      })
    );
  });

  it("sendOtpEmail sends verification code", async () => {
    const service = new EmailService();
    await service.sendOtpEmail("ada@test.com", "123456");

    expect(mockBeginSend).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ subject: "Your verification code" }),
      })
    );
  });
});
