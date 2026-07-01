import { describe, it, expect, vi } from "vitest";
import { mockCasesService } from "@/services/mock/cases.mock";
import { mockCompaniesService } from "@/services/mock/companies.mock";
import { mockDashboardService } from "@/services/mock/dashboard.mock";
import { mockAuthService } from "@/services/mock/auth.mock";
import { mockAuditService } from "@/services/mock/audit.mock";
import { mockNotificationsService } from "@/services/mock/notifications.mock";
import { mockTemplatesService } from "@/services/mock/templates.mock";
import { mockUsersService } from "@/services/mock/users.mock";
import { mockConfigService } from "@/services/mock/config.mock";
import { mockQuestionnaireService } from "@/services/mock/questionnaire.mock";

describe("mock services", () => {
  it("lists mock cases", async () => {
    const result = await mockCasesService.list();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("looks up mock company by uid", async () => {
    const found = await mockCompaniesService.getByUid("CR-12345");
    expect(found.companyName).toBeTruthy();
  });

  it("returns dashboard stats from mock cases", async () => {
    const stats = await mockDashboardService.getCompletionStats("30d");
    expect(stats.period).toBe("30d");
    expect(stats).toHaveProperty("summary");
  });

  it("auth mock supports login and forgot password", async () => {
    const user = await mockAuthService.login("a@b.com", "pass");
    expect(user.email).toBeTruthy();
    await expect(mockAuthService.forgotPassword("a@b.com")).resolves.toBeUndefined();
  });

  it("audit mock returns events", async () => {
    const result = await mockAuditService.list();
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("notifications mock supports read operations", async () => {
    const items = await mockNotificationsService.list();
    expect(items.length).toBeGreaterThan(0);
    const unread = items.find((n) => !n.read);
    if (unread) {
      await mockNotificationsService.markRead(unread.id);
      const after = await mockNotificationsService.list();
      expect(after.find((n) => n.id === unread.id)?.read).toBe(true);
    }
    await mockNotificationsService.markAllRead();
    const allRead = await mockNotificationsService.list();
    expect(allRead.every((n) => n.read)).toBe(true);
  });

  it("templates mock lists and gets by id", async () => {
    const list = await mockTemplatesService.list();
    expect(list.length).toBeGreaterThan(0);
    const tpl = await mockTemplatesService.getById(list[0].id);
    expect(tpl.id).toBe(list[0].id);
  });

  it("users mock lists and saves", async () => {
    const users = await mockUsersService.list();
    expect(users.length).toBeGreaterThan(0);
    const saved = await mockUsersService.save(users);
    expect(saved).toHaveLength(users.length);
  });

  it("config mock gets and saves platform config", async () => {
    const config = await mockConfigService.get();
    expect(config).toHaveProperty("linkValidity");
    const saved = await mockConfigService.save(config);
    expect(saved.linkValidity).toBe(config.linkValidity);
  });

  it("questionnaire mock verifies link and requests OTP", async () => {
    const link = await mockQuestionnaireService.verifyLink("valid-token");
    expect(link.caseId).toBeTruthy();
    await expect(mockQuestionnaireService.requestOtp("valid-token")).resolves.toBeUndefined();
    await expect(mockQuestionnaireService.verifyLink("expired")).rejects.toThrow();
  });

  it("questionnaire mock completes OTP and form lifecycle", async () => {
    const token = "lifecycle-token";
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    await mockQuestionnaireService.requestOtp(token);
    randomSpy.mockRestore();
    const otp = "550000";

    const session = await mockQuestionnaireService.verifyOtp(token, otp);
    expect(session.sessionToken).toBeTruthy();

    const form = await mockQuestionnaireService.getForm(token, session.sessionToken);
    expect(form.template.sections.length).toBeGreaterThan(0);

    await mockQuestionnaireService.saveProgress(token, session.sessionToken, []);
    await mockQuestionnaireService.submit(token, session.sessionToken);
  });

  it("templates mock supports create, save, status, and delete", async () => {
    const created = await mockTemplatesService.create({ name: "Temp", recipientType: "Supplier" });
    const saved = await mockTemplatesService.save({ ...created, name: "Temp Updated" });
    expect(saved.name).toBe("Temp Updated");
    await mockTemplatesService.delete(created.id);
    const active = await mockTemplatesService.updateStatus(
      (await mockTemplatesService.create({ name: "Active Temp", recipientType: "Supplier" })).id,
      "Active",
    );
    expect(active.status).toBe("Active");
  });

  it("cases mock supports getById, resendLink, and create", async () => {
    const { data: cases } = await mockCasesService.list();
    const first = cases[0];
    const found = await mockCasesService.getById(first.id);
    expect(found?.id).toBe(first.id);
    await mockCasesService.resendLink(first.id);
    const created = await mockCasesService.create({
      orderId: "ORD-NEW",
      subjectName: "Created Co",
      country: "UAE",
      recipientType: "Supplier",
      recipientEmail: "new@example.com",
    });
    expect(created.orderId).toBe("ORD-NEW");
  });

  it("auth mock supports session lifecycle", async () => {
    const current = await mockAuthService.getCurrentUser();
    expect(current.email).toBeTruthy();
    await mockAuthService.logout();
    const invite = await mockAuthService.verifyInvitation("invite-token");
    expect(invite.email).toBeTruthy();
    await mockAuthService.completeRegistration("invite-token", "Password123!");
    await mockAuthService.verifyResetToken("reset");
    await mockAuthService.resetPassword("reset", "Password123!");
  });

  it("notifications mock save marks unread items read", async () => {
    const items = await mockNotificationsService.list();
    const saved = await mockNotificationsService.save(items.map((n) => ({ ...n, read: false })));
    expect(saved.length).toBeGreaterThan(0);
  });
});
