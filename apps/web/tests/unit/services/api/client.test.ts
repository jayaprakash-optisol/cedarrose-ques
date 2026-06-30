import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ApiError,
  apiClient,
  apiAuthService,
  apiCasesService,
  apiAuditService,
  apiCompaniesService,
  apiUsersService,
  apiTemplatesService,
  apiConfigService,
  apiNotificationsService,
  apiDashboardService,
} from "@/services/api/client";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

function jsonResponse(body: unknown, status = 200, statusText = "OK") {
  return {
    status,
    statusText,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

const apiUser = {
  userId: "u-1",
  email: "admin@cedarrose.local",
  firstName: "Admin",
  lastName: "User",
  role: "Admin",
  status: "Active",
};

const apiCase = {
  caseId: "c-1",
  caseRef: "CR-1",
  orderId: "ORD-1",
  subjectName: "Acme",
  country: "AE",
  recipientType: "Supplier",
  status: "SENT",
  completionMandatory: 50,
  completionOptional: 10,
  dateReceived: "2026-01-01T00:00:00.000Z",
  currentStep: 1,
  company: {
    companyName: "Acme LLC",
    crisNumber: "CR-55",
    country: "AE",
    riskRating: "Low",
    recipientEmails: ["a@b.com"],
  },
};

const apiTemplate = {
  templateId: "tpl-1",
  name: "Standard",
  recipientType: "Supplier",
  status: "Active",
  lastEdited: "2026-01-01",
  editorName: "Tester",
  sections: [],
};

describe("apiClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockReset();
  });

  it("returns data on successful envelope", async () => {
    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: { ok: true } }));
    await expect(apiClient("/health")).resolves.toEqual({ ok: true });
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/v1/health",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });

  it("throws ApiError when success is false", async () => {
    mocks.fetch.mockResolvedValue(
      jsonResponse({ success: false, error: { code: "AUTH", message: "Unauthorized" } }, 401),
    );
    await expect(apiClient("/protected")).rejects.toMatchObject({
      code: "AUTH",
      message: "Unauthorized",
      status: 401,
    });
  });

  it("throws on empty 204 response", async () => {
    mocks.fetch.mockResolvedValue({ status: 204, statusText: "No Content", json: vi.fn() });
    await expect(apiClient("/empty")).rejects.toBeInstanceOf(ApiError);
  });

  it("throws on invalid JSON", async () => {
    mocks.fetch.mockResolvedValue({
      status: 200,
      statusText: "OK",
      json: vi.fn().mockRejectedValue(new SyntaxError("bad json")),
    });
    await expect(apiClient("/bad")).rejects.toMatchObject({ code: "INVALID_JSON" });
  });
});

describe("apiAuthService", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockReset();
  });

  it("login maps current user from API response", async () => {
    mocks.fetch.mockResolvedValue(
      jsonResponse({ success: true, data: { user: apiUser, token: "jwt" } }),
    );
    const user = await apiAuthService.login("admin@cedarrose.local", "Password123", true);
    expect(user.email).toBe("admin@cedarrose.local");
    expect(user.name).toBe("Admin User");
  });

  it("logout posts to auth endpoint", async () => {
    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: null }));
    await apiAuthService.logout();
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/v1/auth/logout",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("getCurrentUser fetches me", async () => {
    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: apiUser }));
    const user = await apiAuthService.getCurrentUser();
    expect(user.id).toBe("u-1");
  });

  it("verifyInvitation and completeRegistration", async () => {
    mocks.fetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: { firstName: "A", lastName: "B", email: "a@b.com", role: "Analyst" },
      }),
    );
    const invite = await apiAuthService.verifyInvitation("token-1");
    expect(invite.email).toBe("a@b.com");

    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: null }));
    await apiAuthService.completeRegistration("token-1", "Password123!");
  });

  it("forgotPassword, verifyResetToken, resetPassword", async () => {
    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: null }));
    await apiAuthService.forgotPassword("user@cedarrose.com");

    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: { valid: true } }));
    await apiAuthService.verifyResetToken("reset-token");

    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: null }));
    await apiAuthService.resetPassword("reset-token", "NewPassword123!");
  });
});

describe("apiCasesService", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockReset();
  });

  it("lists cases with pagination", async () => {
    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: [apiCase] }));
    const cases = await apiCasesService.list();
    expect(cases).toHaveLength(1);
    expect(cases[0].id).toBe("c-1");
  });

  it("gets case by id and returns undefined on 404", async () => {
    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: apiCase }));
    const found = await apiCasesService.getById("c-1");
    expect(found?.orderId).toBe("ORD-1");

    mocks.fetch.mockResolvedValue(
      jsonResponse({ success: false, error: { code: "NOT_FOUND", message: "missing" } }, 404),
    );
    await expect(apiCasesService.getById("missing")).resolves.toBeUndefined();

    const { ApiError } = await import("@/services/api/errors");
    mocks.fetch.mockRejectedValue(new ApiError("SERVER", "boom", 500));
    await expect(apiCasesService.getById("c-1")).rejects.toThrow();
  });

  it("creates case and resends link", async () => {
    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: apiCase }));
    const created = await apiCasesService.create({
      orderId: "ORD-2",
      subjectName: "Beta",
      country: "AE",
      recipientType: "Supplier",
    });
    expect(created.id).toBe("c-1");

    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: apiCase }));
    await apiCasesService.resendLink("c-1");
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/v1/cases/c-1/resend-link",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});

describe("apiAuditService", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockReset();
  });

  it("lists audit events", async () => {
    mocks.fetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: [
          {
            auditId: "a-1",
            eventType: "CASE_CREATED",
            description: "Created",
            status: "SUCCESS",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    );
    const events = await apiAuditService.list({ caseId: "c-1" });
    expect(events[0].id).toBe("a-1");
  });
});

describe("apiCompaniesService", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockReset();
  });

  it("gets company by uid", async () => {
    mocks.fetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          companyId: "1",
          companyName: "Acme",
          crisNumber: "CR-1",
          country: "AE",
          riskRating: "Low",
          recipientEmails: ["a@b.com"],
        },
      }),
    );
    const company = await apiCompaniesService.getByUid("CR-1");
    expect(company.companyName).toBe("Acme");
  });
});

describe("apiUsersService", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockReset();
  });

  it("lists and saves users with invite flow", async () => {
    const newApiUser = {
      ...apiUser,
      userId: "u-2",
      email: "new@cedarrose.local",
      firstName: "New",
      lastName: "User",
      role: "Analyst",
    };

    mocks.fetch.mockResolvedValueOnce(jsonResponse({ success: true, data: [apiUser] }));
    const users = await apiUsersService.list();
    expect(users[0].email).toBe("admin@cedarrose.local");

    mocks.fetch
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [apiUser] }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: null }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: newApiUser }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [newApiUser] }));

    const saved = await apiUsersService.save([
      {
        id: "local-u-1",
        name: "New User",
        email: "new@cedarrose.local",
        role: "analyst",
        status: "Pending",
      },
    ]);
    expect(saved).toHaveLength(1);
    expect(saved[0].email).toBe("new@cedarrose.local");
  });

  it("updates existing users on save", async () => {
    const uuid = "00000000-0000-0000-0000-000000000001";
    const existingApiUser = { ...apiUser, userId: uuid };
    const updatedUser = { ...existingApiUser, firstName: "Updated", lastName: "Admin" };
    mocks.fetch
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [existingApiUser] }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: updatedUser }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [updatedUser] }));

    const saved = await apiUsersService.save([
      {
        id: uuid,
        name: "Updated Admin",
        email: "admin@cedarrose.local",
        role: "admin",
        status: "Active",
      },
    ]);
    expect(saved[0].name).toBe("Updated Admin");
  });

  it("deletes users removed from save payload", async () => {
    mocks.fetch
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [apiUser] }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: null }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [] }));

    const saved = await apiUsersService.save([]);
    expect(saved).toHaveLength(0);
  });
});

describe("apiTemplatesService", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockReset();
  });

  it("lists, gets, creates, saves, updates status, deletes, and saveAll", async () => {
    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: [apiTemplate] }));
    const list = await apiTemplatesService.list();
    expect(list[0].id).toBe("tpl-1");

    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: apiTemplate }));
    const tpl = await apiTemplatesService.getById("tpl-1");
    expect(tpl.name).toBe("Standard");

    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: apiTemplate }));
    const created = await apiTemplatesService.create({
      name: "New",
      recipientType: "Supplier",
    });
    expect(created.name).toBe("Standard");

    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: apiTemplate }));
    const saved = await apiTemplatesService.save({
      id: "tpl-1",
      name: "Updated",
      recipientType: "Supplier",
      status: "Draft",
      lastEdited: "today",
      editor: "Tester",
      sections: [],
    });
    expect(saved.id).toBe("tpl-1");

    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: { ...apiTemplate, status: "Active" } }));
    const active = await apiTemplatesService.updateStatus("tpl-1", "Active");
    expect(active.status).toBe("Active");

    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: null }));
    await apiTemplatesService.delete("tpl-1");

    mocks.fetch
      .mockResolvedValueOnce(jsonResponse({ success: true, data: apiTemplate }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [apiTemplate] }));
    const all = await apiTemplatesService.saveAll([
      {
        id: "local-tpl-1",
        name: "Local",
        recipientType: "Supplier",
        status: "Draft",
        lastEdited: "today",
        editor: "Tester",
        sections: [],
      },
    ]);
    expect(all).toHaveLength(1);

    const remoteId = "00000000-0000-0000-0000-000000000099";
    mocks.fetch
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ...apiTemplate, templateId: remoteId } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [{ ...apiTemplate, templateId: remoteId }] }));
    const updated = await apiTemplatesService.saveAll([
      {
        id: remoteId,
        name: "Remote",
        recipientType: "Supplier",
        status: "Draft",
        lastEdited: "today",
        editor: "Tester",
        sections: [],
      },
    ]);
    expect(updated[0].id).toBe(remoteId);
  });
});

describe("apiConfigService", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockReset();
  });

  it("gets and saves platform config", async () => {
    mocks.fetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          configId: "cfg-1",
          linkValidityDays: 10,
          tokenType: "single-use",
          otpExpiryMinutes: 10,
          otpMaxAttempts: 3,
          lockoutMinutes: 15,
          otpResendLimit: 3,
          reminder1Days: 3,
          reminder2Days: 5,
          reminder3Days: 7,
          expiryDays: 10,
          gamificationEnabled: true,
          midProgressPromptEnabled: true,
          midProgressPromptText: "Halfway",
          nearCompletePromptEnabled: true,
          nearCompletePromptText: "Almost",
          rewardSystemEnabled: true,
          auditRetentionDays: 365,
          exportFormat: "csv",
          staleCaseHours: 72,
        },
      }),
    );
    const config = await apiConfigService.get();
    expect(config.linkValidity).toBe(10);

    mocks.fetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          configId: "cfg-1",
          linkValidityDays: 14,
          tokenType: "single-use",
          otpExpiryMinutes: 10,
          otpMaxAttempts: 3,
          lockoutMinutes: 15,
          otpResendLimit: 3,
          reminder1Days: 3,
          reminder2Days: 5,
          reminder3Days: 7,
          expiryDays: 10,
          gamificationEnabled: true,
          midProgressPromptEnabled: true,
          midProgressPromptText: "Halfway",
          nearCompletePromptEnabled: true,
          nearCompletePromptText: "Almost",
          rewardSystemEnabled: true,
          auditRetentionDays: 365,
          exportFormat: "csv",
          staleCaseHours: 72,
        },
      }),
    );
    const saved = await apiConfigService.save(config);
    expect(saved.linkValidity).toBe(14);
  });
});

describe("apiNotificationsService", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockReset();
  });

  it("lists, marks read, marks all read, and saves", async () => {
    mocks.fetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: [
          {
            notificationId: "n-1",
            userId: "u-1",
            type: "CASE_UPDATE",
            title: "Update",
            body: "Body",
            read: false,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    );
    const items = await apiNotificationsService.list();
    expect(items[0].id).toBe("n-1");

    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: null }));
    await apiNotificationsService.markRead("n-1");

    mocks.fetch.mockResolvedValue(jsonResponse({ success: true, data: null }));
    await apiNotificationsService.markAllRead();

    mocks.fetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: [
          {
            notificationId: "n-1",
            userId: "u-1",
            type: "CASE_UPDATE",
            title: "Update",
            body: "Body",
            read: true,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    );
    const saved = await apiNotificationsService.save(
      items.map((n) => ({ ...n, read: true })),
    );
    expect(saved[0]?.read).toBe(true);
  });

  it("marks only unread notifications when saving mixed read state", async () => {
    mocks.fetch
      .mockResolvedValueOnce(jsonResponse({ success: true, data: null }))
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: [
            {
              notificationId: "n-2",
              userId: "u-1",
              type: "CASE_UPDATE",
              title: "Unread",
              body: "Body",
              read: false,
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      );

    await apiNotificationsService.save([
      { id: "n-1", type: "submission", title: "Read", body: "B", time: "1h", read: true },
      { id: "n-2", type: "submission", title: "Unread", body: "B", time: "2h", read: false },
    ]);

    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/v1/notifications/n-2/read",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});

describe("apiDashboardService", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockReset();
  });

  it("fetches completion stats", async () => {
    mocks.fetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          period: "30d",
          summary: { total: 1, completed: 1, inProgress: 0, expired: 0 },
          series: [],
        },
      }),
    );
    const stats = await apiDashboardService.getCompletionStats("30d");
    expect(stats.period).toBe("30d");
  });
});
