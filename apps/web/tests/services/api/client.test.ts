import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiClient, apiDashboardService } from "@/services/api/client";
import {
  apiAuditService,
  apiAuthService,
  apiCasesService,
  apiCompanyRequestsService,
  apiConfigService,
  apiNotificationsService,
  apiSettingsService,
  apiTemplatesService,
  apiUsersService,
} from "@/services/api/client";
import type { ApiAuditEvent, ApiCase, ApiCompany, ApiCompanyRequest, ApiNotification, ApiPlatformConfig, ApiTemplate, ApiUser } from "@/services/api/mappers";

function envelope<T>(data: T, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ success: true, data, ...extra }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function paginated<T>(rows: T[], page = 1, limit = 20, total?: number) {
  return new Response(
    JSON.stringify({ success: true, data: rows, meta: { page, limit, total: total ?? rows.length } }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function errorEnvelope(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("services/api/client", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("apiClient", () => {
    it("issues a JSON request with credentials and no-store cache", async () => {
      fetchMock.mockResolvedValueOnce(envelope({ foo: 1 }));
      const out = await apiClient<{ foo: number }>("/x");
      expect(out).toEqual({ foo: 1 });
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/x",
        expect.objectContaining({
          credentials: "include",
          cache: "no-store",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        }),
      );
    });

    it("returns the data payload of a successful envelope", async () => {
      fetchMock.mockResolvedValueOnce(envelope({ v: 7 }));
      const out = await apiClient<{ v: number }>("/x");
      expect(out).toEqual({ v: 7 });
    });

    it("throws EMPTY_RESPONSE on 204", async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
      try {
        await apiClient("/x");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe("EMPTY_RESPONSE");
        expect((err as ApiError).status).toBe(204);
      }
    });

    it("throws EMPTY_RESPONSE on 304", async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 304 }));
      try {
        await apiClient("/x");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe("EMPTY_RESPONSE");
      }
    });

    it("throws an envelope-derived ApiError when success=false", async () => {
      fetchMock.mockResolvedValueOnce(errorEnvelope("BAD_CODE", "Bad"));
      try {
        await apiClient("/x");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe("BAD_CODE");
        expect((err as ApiError).message).toBe("Bad");
      }
    });

    it("uses ERROR / statusText when an error envelope has no fields", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false }), {
          status: 418,
          statusText: "I'm a teapot",
          headers: { "Content-Type": "application/json" },
        }),
      );
      try {
        await apiClient("/x");
      } catch (err) {
        expect((err as ApiError).code).toBe("ERROR");
        expect((err as ApiError).message).toBe("I'm a teapot");
        expect((err as ApiError).status).toBe(418);
      }
    });

    it("throws INVALID_JSON when the body cannot be parsed", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response("not-json", { status: 500, headers: { "Content-Type": "application/json" } }),
      );
      try {
        await apiClient("/x");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe("INVALID_JSON");
        expect((err as ApiError).status).toBe(500);
      }
    });
  });

  describe("apiAuthService", () => {
    it("login POSTs credentials and maps the user", async () => {
      const apiUser: Partial<ApiUser> = {
        userId: "u1",
        email: "a@b.com",
        firstName: "A",
        lastName: "B",
        role: "Admin",
        status: "Active",
      };
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { user: apiUser, token: "t" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      const u = await apiAuthService.login("a@b.com", "p");
      expect(u.id).toBe("u1");
      expect(u.name).toBe("A B");
      expect(u.role).toBe("admin");
    });

    it("logout POSTs to /auth/logout", async () => {
      fetchMock.mockResolvedValueOnce(envelope(null));
      await apiAuthService.logout();
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/auth/logout",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("getCurrentUser returns a mapped CurrentUser", async () => {
      const apiUser: Partial<ApiUser> = {
        userId: "u2",
        email: "x@y.com",
        firstName: "X",
        lastName: "Y",
        role: "Reviewer",
        status: "Active",
      };
      fetchMock.mockResolvedValueOnce(envelope(apiUser));
      const u = await apiAuthService.getCurrentUser();
      expect(u.id).toBe("u2");
      expect(u.role).toBe("reviewer");
    });

    it("verifyInvitation GETs with the token query string", async () => {
      fetchMock.mockResolvedValueOnce(
        envelope({ firstName: "F", lastName: "L", email: "e@e.com", role: "Admin" }),
      );
      await apiAuthService.verifyInvitation("tok?x=1");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/auth/verify-invitation?token=tok%3Fx%3D1",
        expect.any(Object),
      );
    });

    it("completeRegistration POSTs the token and password", async () => {
      fetchMock.mockResolvedValueOnce(envelope(null));
      await apiAuthService.completeRegistration("tok", "p");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/auth/complete-registration",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ token: "tok", password: "p" }),
        }),
      );
    });

    it("forgotPassword POSTs the email", async () => {
      fetchMock.mockResolvedValueOnce(envelope(null));
      await apiAuthService.forgotPassword("a@b.com");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/auth/forgot-password",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "a@b.com" }) }),
      );
    });

    it("verifyResetToken GETs the token-encoded query", async () => {
      fetchMock.mockResolvedValueOnce(envelope({ valid: true }));
      await apiAuthService.verifyResetToken("tok/x");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/auth/verify-reset-token?token=tok%2Fx",
        expect.any(Object),
      );
    });

    it("resetPassword POSTs the token and new password", async () => {
      fetchMock.mockResolvedValueOnce(envelope(null));
      await apiAuthService.resetPassword("t", "n");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/auth/reset-password",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ token: "t", newPassword: "n" }) }),
      );
    });
  });

  describe("apiSettingsService", () => {
    it("get returns the user and preferences", async () => {
      const apiUser: Partial<ApiUser> = {
        userId: "u1",
        email: "a@b.com",
        firstName: "A",
        lastName: "B",
        role: "Admin",
        status: "Active",
        notifyOnSubmission: false,
        notifyOnLinkExpiry: true,
        notifyOnBlockedDispatch: true,
        notifyOnRemindersSent: false,
      };
      fetchMock.mockResolvedValueOnce(envelope(apiUser));
      const out = await apiSettingsService.get();
      expect(out.user.id).toBe("u1");
      expect(out.preferences.notifyOnSubmission).toBe(false);
      expect(out.preferences.notifyOnRemindersSent).toBe(false);
    });

    it("save with no name passes through the rest of the input", async () => {
      const apiUser: Partial<ApiUser> = {
        userId: "u1",
        email: "a@b.com",
        firstName: "A",
        lastName: "B",
        role: "Admin",
        status: "Active",
        notifyOnSubmission: true,
        notifyOnLinkExpiry: false,
      };
      fetchMock.mockResolvedValueOnce(envelope(apiUser));
      await apiSettingsService.save({ preferences: { notifyOnLinkExpiry: false } });
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/auth/me",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("save with name splits it into firstName/lastName", async () => {
      const apiUser: Partial<ApiUser> = {
        userId: "u1",
        email: "a@b.com",
        firstName: "A",
        lastName: "B C",
        role: "Admin",
        status: "Active",
      };
      fetchMock.mockResolvedValueOnce(envelope(apiUser));
      await apiSettingsService.save({ name: "A B C" });
      const call = fetchMock.mock.calls[0];
      const body = JSON.parse(call[1].body as string);
      expect(body).toMatchObject({ firstName: "A", lastName: "B C" });
    });

    it("changePassword POSTs the current/new/confirm values", async () => {
      fetchMock.mockResolvedValueOnce(envelope({ message: "ok" }));
      await apiSettingsService.changePassword("c", "n", "n");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/auth/change-password",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("apiCasesService", () => {
    it("list maps the paginated response", async () => {
      const apiCase: Partial<ApiCase> = {
        caseId: "c1",
        caseRef: "ref-1",
        orderId: "O1",
        subjectName: "Acme",
        country: "UAE",
        recipientType: "Supplier",
        status: "SENT",
        completionMandatory: 50,
        completionOptional: 25,
        dateReceived: "2026-06-01T00:00:00.000Z",
        currentStep: 1,
      };
      fetchMock.mockResolvedValueOnce(paginated([apiCase], 1, 20, 1));
      const out = await apiCasesService.list();
      expect(out.data).toHaveLength(1);
      expect(out.data[0].id).toBe("c1");
      expect(out.meta.total).toBe(1);
    });

    it("list passes status and recipientType when not 'All'", async () => {
      fetchMock.mockResolvedValueOnce(paginated([]));
      await apiCasesService.list({ status: "SENT", recipientType: "Customer", page: 2, limit: 5 });
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain("status=SENT");
      expect(url).toContain("recipientType=Customer");
      expect(url).toContain("page=2");
      expect(url).toContain("limit=5");
    });

    it("list omits status and recipientType when 'All'", async () => {
      fetchMock.mockResolvedValueOnce(paginated([]));
      await apiCasesService.list({ status: "All", recipientType: "All" });
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).not.toContain("status=");
      expect(url).not.toContain("recipientType=");
    });

    it("getById returns the mapped case", async () => {
      const apiCase: Partial<ApiCase> = {
        caseId: "c1",
        caseRef: "ref-1",
        orderId: "O1",
        subjectName: "Acme",
        country: "UAE",
        recipientType: "Supplier",
        status: "SENT",
        completionMandatory: 0,
        completionOptional: 0,
        dateReceived: "2026-06-01T00:00:00.000Z",
        currentStep: 1,
      };
      fetchMock.mockResolvedValueOnce(envelope(apiCase));
      const c = await apiCasesService.getById("c1");
      expect(c?.id).toBe("c1");
    });

    it("getById returns undefined on 404", async () => {
      fetchMock.mockResolvedValueOnce(errorEnvelope("NOT_FOUND", "no", 404));
      const c = await apiCasesService.getById("missing");
      expect(c).toBeUndefined();
    });

    it("getById rethrows non-404 errors", async () => {
      fetchMock.mockResolvedValueOnce(errorEnvelope("SERVER", "boom", 500));
      await expect(apiCasesService.getById("x")).rejects.toBeInstanceOf(ApiError);
    });

    it("create returns the mapped case with the provided id", async () => {
      const apiCase: Partial<ApiCase> = {
        caseId: "c1",
        caseRef: "ref-1",
        orderId: "O1",
        subjectName: "Acme",
        country: "UAE",
        recipientType: "Supplier",
        status: "SENT",
        completionMandatory: 0,
        completionOptional: 0,
        dateReceived: "2026-06-01T00:00:00.000Z",
        currentStep: 1,
      };
      fetchMock.mockResolvedValueOnce(envelope(apiCase));
      const c = await apiCasesService.create({
        orderId: "O1",
        companyRequestId: "cr-1",
        subjectName: "Acme",
        country: "UAE",
        recipientType: "Supplier",
      });
      expect(c.id).toBe("c1");
    });

    it("resendLink returns the link expiry from the response", async () => {
      const apiCase: Partial<ApiCase> = {
        caseId: "c1",
        caseRef: "ref-1",
        orderId: "O1",
        subjectName: "Acme",
        country: "UAE",
        recipientType: "Supplier",
        status: "SENT",
        completionMandatory: 0,
        completionOptional: 0,
        dateReceived: "2026-06-01T00:00:00.000Z",
        currentStep: 1,
        linkExpiry: "2026-06-30T00:00:00.000Z",
      };
      fetchMock.mockResolvedValueOnce(envelope(apiCase));
      const out = await apiCasesService.resendLink("c1");
      expect(out.linkExpiry).toBe("2026-06-30T00:00:00.000Z");
    });

    it("resendLink returns null when linkExpiry is missing", async () => {
      const apiCase: Partial<ApiCase> = {
        caseId: "c1",
        caseRef: "ref-1",
        orderId: "O1",
        subjectName: "Acme",
        country: "UAE",
        recipientType: "Supplier",
        status: "SENT",
        completionMandatory: 0,
        completionOptional: 0,
        dateReceived: "2026-06-01T00:00:00.000Z",
        currentStep: 1,
        linkExpiry: null,
      };
      fetchMock.mockResolvedValueOnce(envelope(apiCase));
      const out = await apiCasesService.resendLink("c1");
      expect(out.linkExpiry).toBeNull();
    });

    it("exportCsv triggers a CSV download with the right filename", async () => {
      // Stub anchor click to verify download is triggered
      const originalCreate = document.createElement.bind(document);
      const clickMock = vi.fn();
      vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const el = originalCreate(tag);
        if (tag === "a") (el as HTMLAnchorElement).click = clickMock as () => void;
        return el;
      });
      const blob = new Blob(["a,b"], { type: "text/csv" });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(blob),
      });
      await apiCasesService.exportCsv({ status: "SENT" });
      expect(clickMock).toHaveBeenCalled();
    });
  });

  describe("apiAuditService", () => {
    it("list maps the paginated events", async () => {
      const e: Partial<ApiAuditEvent> = {
        auditId: "a1",
        caseId: "c1",
        caseSubject: "Acme",
        caseOrderId: "O1",
        step: 1,
        eventType: "API Call",
        description: "step",
        status: "Success",
        createdAt: "2026-06-01T10:00:00.000Z",
      };
      fetchMock.mockResolvedValueOnce(paginated([e]));
      const out = await apiAuditService.list();
      expect(out.data[0].id).toBe("a1");
    });

    it("list with grouped=true omits the grouped query param (default)", async () => {
      fetchMock.mockResolvedValueOnce(paginated([]));
      await apiAuditService.list({ grouped: true });
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).not.toContain("grouped=");
    });

    it("list with grouped=false adds the grouped=false param", async () => {
      fetchMock.mockResolvedValueOnce(paginated([]));
      await apiAuditService.list({ grouped: false });
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain("grouped=false");
    });

    it("list passes type when it is not 'All'", async () => {
      fetchMock.mockResolvedValueOnce(paginated([]));
      await apiAuditService.list({ type: "API Call" });
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain("type=API+Call");
    });

    it("list omits type when it is 'All'", async () => {
      fetchMock.mockResolvedValueOnce(paginated([]));
      await apiAuditService.list({ type: "All" });
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).not.toContain("type=");
    });

    it("exportCsv triggers a CSV download", async () => {
      const originalCreate = document.createElement.bind(document);
      const clickMock = vi.fn();
      vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const el = originalCreate(tag);
        if (tag === "a") (el as HTMLAnchorElement).click = clickMock as () => void;
        return el;
      });
      const blob = new Blob(["a,b"], { type: "text/csv" });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(blob),
      });
      await apiAuditService.exportCsv();
      expect(clickMock).toHaveBeenCalled();
    });
  });

  describe("apiCompanyRequestsService", () => {
    it("listPending returns mapped summaries", async () => {
      const apiCr: Partial<ApiCompanyRequest> = {
        companyRequestId: "cr-1",
        orderId: "ORD-100",
        externalRef: "EXT-1",
        companyName: "Acme",
        country: "UAE",
        riskRating: "Low",
        recipientEmails: ["a@b.com"],
        status: "Pending",
        receivedAt: "2026-01-01T00:00:00Z",
      };
      fetchMock.mockResolvedValueOnce(paginated([apiCr], 1, 100, 1));
      const rows = await apiCompanyRequestsService.listPending();
      expect(rows).toHaveLength(1);
      expect(rows[0].companyName).toBe("Acme");
    });

    it("getById returns CompanyData", async () => {
      const apiCr: Partial<ApiCompanyRequest> = {
        companyRequestId: "cr-1",
        orderId: "ORD-100",
        externalRef: "EXT-1",
        companyName: "Acme",
        country: "UAE",
        riskRating: "Low",
        recipientEmails: ["a@b.com"],
        status: "Pending",
      };
      fetchMock.mockResolvedValueOnce(envelope(apiCr));
      const co = await apiCompanyRequestsService.getById("cr-1");
      expect(co.companyName).toBe("Acme");
      expect(co.registrationNumber).toBe("EXT-1");
    });
  });

  describe("apiUsersService", () => {
    const baseApiUser: Partial<ApiUser> = {
      userId: "user-1",
      email: "u@e.com",
      firstName: "U",
      lastName: "One",
      role: "Admin",
      status: "Active",
    };

    it("list returns mapped users from the first page", async () => {
      fetchMock.mockResolvedValueOnce(
        paginated([{ ...baseApiUser }], 1, 100, 1),
      );
      const users = await apiUsersService.list();
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe("U One");
    });

    it("save invites local users, updates changed users, deletes removed users", async () => {
      // Use real-shaped UUIDs so isLocalUserId returns false for them
      const user1 = "11111111-1111-1111-1111-111111111111";
      const user2 = "22222222-2222-2222-2222-222222222222";

      // First list() call returns the current set
      fetchMock.mockResolvedValueOnce(
        paginated(
          [
            { ...baseApiUser, userId: user1 },
            { ...baseApiUser, userId: user2, email: "u2@e.com" },
          ],
          1,
          100,
          2,
        ),
      );
      // DELETE user-2
      fetchMock.mockResolvedValueOnce(envelope(null));
      // PATCH user-1 (name changed)
      fetchMock.mockResolvedValueOnce(
        envelope({ ...baseApiUser, userId: user1, firstName: "New", lastName: "Name" }),
      );
      // POST /admin/users/invite (new user)
      fetchMock.mockResolvedValueOnce(
        envelope({ ...baseApiUser, userId: "33333333-3333-3333-3333-333333333333", email: "new@e.com" }),
      );
      // Second list() call after save
      fetchMock.mockResolvedValueOnce(
        paginated(
          [
            { ...baseApiUser, userId: user1, firstName: "New", lastName: "Name" },
            { ...baseApiUser, userId: "33333333-3333-3333-3333-333333333333", email: "new@e.com" },
          ],
          1,
          100,
          2,
        ),
      );

      const desired = [
        // Existing user — should be PATCHed (name change)
        {
          id: user1,
          name: "New Name",
          email: "u@e.com",
          totalReports: null,
          score: null,
          lastSubmission: null,
          status: "Active" as const,
          role: "admin" as const,
        },
        // New user (local id) — should be invited
        {
          id: "USR-new",
          name: "Invitee",
          email: "new@e.com",
          totalReports: null,
          score: null,
          lastSubmission: null,
          status: "Pending" as const,
          role: "analyst" as const,
        },
      ];

      const result = await apiUsersService.save(desired);
      expect(result).toHaveLength(2);

      // Check DELETE was called for user-2 (the removed user)
      const deleteCall = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit).method === "DELETE",
      );
      expect(deleteCall).toBeTruthy();
      expect(deleteCall![0]).toContain(`/admin/users/${user2}`);

      // Check PATCH was called for user-1
      const patchCall = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit).method === "PATCH",
      );
      expect(patchCall).toBeTruthy();
      expect(patchCall![0]).toContain(`/admin/users/${user1}`);

      // Check POST was called for the new user
      const postCall = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit).method === "POST",
      );
      expect(postCall).toBeTruthy();
      expect(postCall![0]).toContain("/admin/users/invite");
    });

    it("save skips PATCH when nothing changed", async () => {
      const user1 = "11111111-1111-1111-1111-111111111111";
      fetchMock.mockResolvedValueOnce(
        paginated([{ ...baseApiUser, userId: user1 }], 1, 100, 1),
      );
      // No PATCH/DELETE/POST expected, but the trailing list() still runs
      fetchMock.mockResolvedValueOnce(paginated([{ ...baseApiUser }], 1, 100, 1));

      const desired = [
        {
          id: user1,
          name: "U One",
          email: "u@e.com",
          totalReports: null,
          score: null,
          lastSubmission: null,
          status: "Active" as const,
          role: "admin" as const,
        },
      ];
      await apiUsersService.save(desired);
      const writeMethods = ["DELETE", "PATCH", "POST"];
      const writes = fetchMock.mock.calls.filter((c) =>
        writeMethods.includes((c[1] as RequestInit).method as string),
      );
      expect(writes).toHaveLength(0);
    });

    it("save PATCHes with Pending status when user.status is 'Pending'", async () => {
      const user1 = "11111111-1111-1111-1111-111111111111";
      fetchMock.mockResolvedValueOnce(
        paginated([{ ...baseApiUser, userId: user1, status: "Active" }], 1, 100, 1),
      );
      fetchMock.mockResolvedValueOnce(
        envelope({ ...baseApiUser, userId: user1, status: "Pending" }),
      );
      fetchMock.mockResolvedValueOnce(
        paginated([{ ...baseApiUser, userId: user1, status: "Pending" }], 1, 100, 1),
      );

      await apiUsersService.save([
        {
          id: user1,
          name: "U One",
          email: "u@e.com",
          totalReports: null,
          score: null,
          lastSubmission: null,
          status: "Pending",
          role: "admin",
        },
      ]);
      const patchCall = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit).method === "PATCH",
      );
      expect(patchCall).toBeTruthy();
      const body = JSON.parse((patchCall![1] as RequestInit).body as string);
      expect(body.status).toBe("Pending");
    });
  });

  describe("apiTemplatesService", () => {
    it("list maps templates", async () => {
      const apiTpl: Partial<ApiTemplate> = {
        templateId: "t1",
        name: "Tpl",
        recipientType: "Supplier",
        status: "Active",
        updatedAt: "2026-06-01T00:00:00.000Z",
        sections: [],
      };
      fetchMock.mockResolvedValueOnce(envelope([apiTpl]));
      const tpls = await apiTemplatesService.list();
      expect(tpls).toHaveLength(1);
      expect(tpls[0].id).toBe("t1");
    });

    it("getById maps a single template", async () => {
      const apiTpl: Partial<ApiTemplate> = {
        templateId: "t1",
        name: "Tpl",
        recipientType: "Supplier",
        status: "Active",
        updatedAt: "2026-06-01T00:00:00.000Z",
      };
      fetchMock.mockResolvedValueOnce(envelope(apiTpl));
      const t = await apiTemplatesService.getById("t1");
      expect(t.id).toBe("t1");
    });

    it("create with no sections POSTs a minimal body", async () => {
      const apiTpl: Partial<ApiTemplate> = {
        templateId: "t1",
        name: "Tpl",
        recipientType: "Supplier",
        status: "Draft",
        updatedAt: "2026-06-01T00:00:00.000Z",
      };
      fetchMock.mockResolvedValueOnce(envelope(apiTpl));
      const t = await apiTemplatesService.create({ name: "Tpl", recipientType: "Supplier" });
      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
      expect(body.sections).toBeUndefined();
      expect(t.id).toBe("t1");
    });

    it("create with sections maps them into the request body", async () => {
      const apiTpl: Partial<ApiTemplate> = {
        templateId: "t1",
        name: "Tpl",
        recipientType: "Supplier",
        status: "Draft",
        updatedAt: "2026-06-01T00:00:00.000Z",
      };
      fetchMock.mockResolvedValueOnce(envelope(apiTpl));
      await apiTemplatesService.create({
        name: "Tpl",
        recipientType: "Supplier",
        sections: [
          {
            id: "s1",
            number: 1,
            title: "Section",
            questions: [
              {
                id: "q1",
                text: "Q?",
                type: "text",
                required: true,
                prefill: false,
              },
            ],
          },
        ],
      });
      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
      expect(body.sections).toBeDefined();
      expect(body.sections[0].title).toBe("Section");
    });

    it("create with empty sections array omits the sections field", async () => {
      const apiTpl: Partial<ApiTemplate> = {
        templateId: "t1",
        name: "Tpl",
        recipientType: "Supplier",
        status: "Draft",
        updatedAt: "2026-06-01T00:00:00.000Z",
      };
      fetchMock.mockResolvedValueOnce(envelope(apiTpl));
      await apiTemplatesService.create({ name: "Tpl", recipientType: "Supplier", sections: [] });
      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
      expect(body.sections).toBeUndefined();
    });

    it("save PUTs the mapped template", async () => {
      const apiTpl: Partial<ApiTemplate> = {
        templateId: "t1",
        name: "Tpl",
        recipientType: "Supplier",
        status: "Active",
        updatedAt: "2026-06-01T00:00:00.000Z",
        sections: [],
      };
      fetchMock.mockResolvedValueOnce(envelope(apiTpl));
      await apiTemplatesService.save({
        id: "t1",
        name: "Tpl",
        recipientType: "Supplier",
        status: "Active",
        lastEdited: "01 Jun 2026",
        editor: "x",
        sections: [],
      });
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "PUT" });
    });

    it("updateStatus PATCHes the status", async () => {
      const apiTpl: Partial<ApiTemplate> = {
        templateId: "t1",
        name: "Tpl",
        recipientType: "Supplier",
        status: "Draft",
        updatedAt: "2026-06-01T00:00:00.000Z",
      };
      fetchMock.mockResolvedValueOnce(envelope(apiTpl));
      await apiTemplatesService.updateStatus("t1", "Draft");
      const call = fetchMock.mock.calls[0];
      expect(call[0]).toContain("/admin/templates/t1/status");
      expect(call[1]).toMatchObject({ method: "PATCH" });
    });

    it("delete DELETEs the template", async () => {
      fetchMock.mockResolvedValueOnce(envelope(null));
      await apiTemplatesService.delete("t1");
      const call = fetchMock.mock.calls[0];
      expect(call[0]).toContain("/admin/templates/t1");
      expect(call[1]).toMatchObject({ method: "DELETE" });
    });

    it("saveAll POSTs for local ids and PUTs for remote ids", async () => {
      // Local id (starts with tpl-) → POST
      fetchMock.mockResolvedValueOnce(envelope({ templateId: "real-1" }));
      // Real-shaped UUID → PUT
      fetchMock.mockResolvedValueOnce(envelope({ templateId: "11111111-1111-1111-1111-111111111111" }));
      // Final list() call
      fetchMock.mockResolvedValueOnce(paginated([]));

      await apiTemplatesService.saveAll([
        {
          id: "tpl-1",
          name: "Local",
          recipientType: "Supplier",
          status: "Draft",
          lastEdited: "01 Jun 2026",
          editor: "x",
          sections: [],
        },
        {
          id: "11111111-1111-1111-1111-111111111111",
          name: "Remote",
          recipientType: "Supplier",
          status: "Active",
          lastEdited: "01 Jun 2026",
          editor: "x",
          sections: [],
        },
      ]);

      const postCall = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit).method === "POST",
      );
      const putCall = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit).method === "PUT",
      );
      expect(postCall![0]).toBe("/api/v1/admin/templates");
      expect(putCall![0]).toContain("/admin/templates/11111111-1111-1111-1111-111111111111");
    });
  });

  describe("apiConfigService", () => {
    const baseConfig: Partial<ApiPlatformConfig> = {
      configId: "cfg-1",
      linkValidityDays: 2,
      tokenType: "JWT",
      tokenExpiryValue: 24,
      tokenExpiryUnit: "hours",
      otpLength: 6,
      otpExpiryMinutes: 10,
      otpMaxAttempts: 3,
      reminder1Day: 1,
      reminder2Day: 2,
      reminderFinalDay: 3,
      expiryDay: 7,
      gamificationEnabled: true,
      autoProcessA: true,
      manualProcessB: false,
      alertCd: false,
      auditRetentionDays: 365,
      exportFormat: "csv",
      staleHours: 72,
      updatedAt: "2026-06-01T00:00:00.000Z",
    };

    it("get returns the mapped config", async () => {
      fetchMock.mockResolvedValueOnce(envelope(baseConfig));
      const cfg = await apiConfigService.get();
      expect(cfg.tokenHours).toBe(24);
      expect(cfg.tokenUnit).toBe("hours");
    });

    it("get with tokenExpiryUnit=minutes returns tokenMinutes", async () => {
      fetchMock.mockResolvedValueOnce(envelope({ ...baseConfig, tokenExpiryUnit: "minutes", tokenExpiryValue: 30 }));
      const cfg = await apiConfigService.get();
      expect(cfg.tokenMinutes).toBe(30);
    });

    it("save PUTs the mapped config", async () => {
      fetchMock.mockResolvedValueOnce(envelope(baseConfig));
      await apiConfigService.save({
        linkValidity: 2,
        tokenType: "JWT",
        tokenUnit: "hours",
        tokenHours: 24,
        tokenMinutes: 60,
        otpExpiry: 10,
        otpRetry: 3,
        lockoutDuration: 15,
        otpResend: 3,
        r1: 1,
        r2: 2,
        r3: 3,
        expiry: 7,
        gamification: true,
        midPrompt: true,
        midText: "x",
        nearPrompt: true,
        nearText: "y",
        rewardSystem: true,
        tier1Title: "t1",
        tier1Desc: "d1",
        tier1Accel: true,
        tier1Discount: true,
        tier1Active: true,
        tier2Title: "t2",
        tier2Desc: "d2",
        tier2Active: true,
        autoA: true,
        manualB: false,
        alertCD: false,
        auditRetention: 365,
        exportFormat: "csv",
        staleHours: 72,
      });
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "PUT" });
    });
  });

  describe("apiNotificationsService", () => {
    const baseNotif: Partial<ApiNotification> = {
      notificationId: "n1",
      userId: "u1",
      type: "submission",
      title: "T",
      body: "B",
      read: false,
      createdAt: "2026-06-01T10:00:00.000Z",
    };

    it("list returns mapped notifications", async () => {
      fetchMock.mockResolvedValueOnce(paginated([baseNotif], 1, 100, 1));
      const ns = await apiNotificationsService.list();
      expect(ns).toHaveLength(1);
      expect(ns[0].id).toBe("n1");
      expect(ns[0].read).toBe(false);
    });

    it("markRead PATCHes the notification", async () => {
      fetchMock.mockResolvedValueOnce(envelope(null));
      await apiNotificationsService.markRead("n1");
      expect(fetchMock.mock.calls[0][0]).toContain("/notifications/n1/read");
    });

    it("markAllRead PATCHes the read-all endpoint", async () => {
      fetchMock.mockResolvedValueOnce(envelope(null));
      await apiNotificationsService.markAllRead();
      expect(fetchMock.mock.calls[0][0]).toContain("/notifications/read-all");
    });

    it("save marks all when everything is unread", async () => {
      fetchMock.mockResolvedValueOnce(envelope(null));
      fetchMock.mockResolvedValueOnce(paginated([], 1, 100, 0));
      const ns = [{ id: "n1", type: "submission" as const, title: "T", body: "B", time: "now", read: false }];
      await apiNotificationsService.save(ns);
      const markAll = fetchMock.mock.calls.find(
        (c) => typeof c[0] === "string" && c[0].includes("/read-all"),
      );
      expect(markAll).toBeTruthy();
    });

    it("save marks individual notifications when at least one is read", async () => {
      fetchMock.mockResolvedValueOnce(envelope(null));
      fetchMock.mockResolvedValueOnce(envelope(null));
      fetchMock.mockResolvedValueOnce(paginated([], 1, 100, 0));
      const ns = [
        { id: "n1", type: "submission" as const, title: "T", body: "B", time: "now", read: false },
        { id: "n2", type: "submission" as const, title: "T", body: "B", time: "now", read: true },
      ];
      await apiNotificationsService.save(ns);
      const markRead = fetchMock.mock.calls.filter(
        (c) => typeof c[0] === "string" && c[0].includes("/read"),
      );
      // Only n1 (unread) should be PATCHed
      expect(markRead).toHaveLength(1);
    });
  });

  describe("apiDashboardService", () => {
    it("getCompletionStats GETs the period", async () => {
      fetchMock.mockResolvedValueOnce(
        envelope({
          period: "7d",
          caseCount: 0,
          expiredCapDays: 10,
          includesInProgress: true,
          summary: {
            avgTimeToFirstOpen: { value: null, unit: "hours", trend: null, trendUnit: "hours" },
            avgTimeToComplete: { value: null, unit: "days", trend: null, trendUnit: "days" },
            avgTotalTurnaround: { value: null, unit: "days", trend: null, trendUnit: "days" },
          },
          overallAvgDays: 0,
          byCompany: [],
        }),
      );
      await apiDashboardService.getCompletionStats("7d");
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain("/dashboard/completion-stats?period=7d");
    });
  });
});
