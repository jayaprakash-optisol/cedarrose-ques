import { EmailClient } from "@azure/communication-email";
import Handlebars from "handlebars";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "../shared/errors/AppError.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class EmailService {
  private readonly client: EmailClient | null = null;

  constructor() {
    if (!env.azureEmailConnectionString) return;

    try {
      this.client = new EmailClient(env.azureEmailConnectionString);
    } catch (error) {
      logger.warn(
        { err: error },
        "Azure email client disabled: invalid AZURE_EMAIL_CONNECTION_STRING",
      );
    }
  }

  private async renderTemplate(templateName: string, data: Record<string, unknown>): Promise<string> {
    const templatePath = path.join(__dirname, "..", "email", "templates", `${templateName}.hbs`);
    if (!fs.existsSync(templatePath)) {
      return `<p>${JSON.stringify(data)}</p>`;
    }
    const source = fs.readFileSync(templatePath, "utf-8");
    return Handlebars.compile(source)(data);
  }

  async sendEmail(to: string, subject: string, templateName: string, data: Record<string, unknown>): Promise<void> {
    const html = await this.renderTemplate(templateName, { ...data, subject });

    if (!this.client || !env.azureEmailSender) {
      logger.info({ to, subject, templateName, data }, "email skipped (no Azure config)");
      return;
    }

    try {
      const poller = await this.client.beginSend({
        senderAddress: env.azureEmailSender,
        recipients: { to: [{ address: to }] },
        content: { subject, html },
      });
      await poller.pollUntilDone();
    } catch (err) {
      logger.error({ err, to, subject, templateName }, "email send failed");
      throw new AppError(
        502,
        "EMAIL_SEND_FAILED",
        "Email could not be sent. Verify Azure Communication Services sender domain configuration.",
      );
    }
  }

  async sendInvitationEmail(user: { firstName: string; email: string }, token: string): Promise<void> {
    const link = `${env.frontendUrl}/complete-registration?token=${token}`;
    await this.sendEmail(user.email, "You're invited to CedarRose OpsHub", "invitation", {
      firstName: user.firstName,
      link,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const link = `${env.frontendUrl}/reset-password?token=${token}`;
    await this.sendEmail(email, "Reset your password", "password-reset", { link });
  }

  async sendQuestionnaireLink(email: string, subjectName: string, link: string): Promise<void> {
    await this.sendEmail(email, `Questionnaire for ${subjectName}`, "questionnaire-link", {
      subjectName,
      link,
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    await this.sendEmail(email, "Your verification code", "otp", { otp });
  }
}
