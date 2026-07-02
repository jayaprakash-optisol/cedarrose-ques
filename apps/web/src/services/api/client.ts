import type {
  CaseRecord,
  AuditEvent,
  CompanyData,
  User,
  Template,
  PlatformConfig,
  Notification,
  CurrentUser,
} from "@/types";
import type { InvitationInfo } from "@/types/user";
import type { SaveSettingsInput, SettingsService, CreateCaseInput } from "../types";
import { env } from "@/config/env";
import { apiListWithMeta, downloadApiCsv } from "./listing";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import type { PaginatedResult } from "@/types/pagination";
import type { AuditListParams } from "@/types/audit";
import type { CaseListParams } from "@/types/case";
import { ApiError } from "./errors";
import { parseApiEnvelope } from "./envelope";
import {
  mapAuditEvent,
  mapCase,
  mapCompany,
  mapCurrentUser,
  mapNotificationPreferences,
  mapNotification,
  mapPlatformConfig,
  mapPlatformConfigToApi,
  mapTemplate,
  mapTemplateToApi,
  mapUser,
  splitName,
  toApiRole,
  isLocalUserId,
  isLocalTemplateId,
  type ApiAuditEvent,
  type ApiCase,
  type ApiCompany,
  type ApiNotification,
  type ApiPlatformConfig,
  type ApiTemplate,
  type ApiUser,
} from "./mappers";

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (res.status === 304 || res.status === 204) {
    throw new ApiError("EMPTY_RESPONSE", "Empty response from server", res.status);
  }

  const body = await parseApiEnvelope<T>(res);

  if (!body.success) {
    const code = body.error?.code ?? "ERROR";
    const message = body.error?.message ?? res.statusText;
    throw new ApiError(code, message, res.status);
  }

  return body.data as T;
}

async function fetchPaginated<T>(path: string, limit = 100): Promise<T[]> {
  const { data } = await apiListWithMeta<T>(path, { page: 1, limit });
  return data;
}

function toCaseListQuery(params: CaseListParams = {}) {
  return {
    page: params.page ?? 1,
    limit: params.limit ?? DEFAULT_PAGE_SIZE,
    search: params.search,
    status: params.status && params.status !== "All" ? params.status : undefined,
    recipientType:
      params.recipientType && params.recipientType !== "All" ? params.recipientType : undefined,
    from: params.from,
    to: params.to,
  };
}

function toAuditListQuery(params: AuditListParams = {}) {
  return {
    page: params.page ?? 1,
    limit: params.limit ?? DEFAULT_PAGE_SIZE,
    search: params.search,
    caseId: params.caseId,
    type: params.type && params.type !== "All" ? params.type : undefined,
    from: params.from,
    to: params.to,
    grouped: params.grouped === false ? "false" : undefined,
  };
}


export const apiAuthService = {
  async login(email: string, password: string, rememberMe = false): Promise<CurrentUser> {
    const data = await apiClient<{
      user: ApiUser;
      token: string;
      refreshToken?: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, rememberMe }),
    });
    return mapCurrentUser(data.user);
  },

  async logout(): Promise<void> {
    await apiClient<null>("/auth/logout", { method: "POST", body: JSON.stringify({}) });
  },

  async getCurrentUser(): Promise<CurrentUser> {
    const user = await apiClient<ApiUser>("/auth/me");
    return mapCurrentUser(user);
  },

  async verifyInvitation(token: string): Promise<InvitationInfo> {
    return apiClient<InvitationInfo>(`/auth/verify-invitation?token=${encodeURIComponent(token)}`);
  },

  async completeRegistration(token: string, password: string): Promise<void> {
    await apiClient<null>("/auth/complete-registration", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient<null>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async verifyResetToken(token: string): Promise<void> {
    await apiClient<{ valid: boolean }>(
      `/auth/verify-reset-token?token=${encodeURIComponent(token)}`,
    );
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient<null>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  },
};

export const apiSettingsService: SettingsService = {
  async get() {
    const user = await apiClient<ApiUser>("/auth/me");
    return {
      user: mapCurrentUser(user),
      preferences: mapNotificationPreferences(user),
    };
  },

  async save(input: SaveSettingsInput) {
    const { firstName, lastName } = input.name ? splitName(input.name) : { firstName: undefined, lastName: undefined };
    const user = await apiClient<ApiUser>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify({
        ...(firstName === undefined ? {} : { firstName, lastName }),
        ...input.preferences,
      }),
    });
    return {
      user: mapCurrentUser(user),
      preferences: mapNotificationPreferences(user),
    };
  },

  async changePassword(currentPassword, newPassword, confirmPassword) {
    await apiClient<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
  },
};

export const apiCasesService = {
  async list(params: CaseListParams = {}): Promise<PaginatedResult<CaseRecord>> {
    const result = await apiListWithMeta<ApiCase>("/cases", toCaseListQuery(params));
    return { ...result, data: result.data.map((c) => mapCase(c)) };
  },

  async exportCsv(params: Omit<CaseListParams, "page" | "limit"> = {}): Promise<void> {
    await downloadApiCsv("/cases/export", toCaseListQuery(params), "cedarrose-cases.csv");
  },

  async getById(id: string): Promise<CaseRecord | undefined> {
    try {
      const row = await apiClient<ApiCase>(`/cases/${id}`);
      return mapCase(row);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return undefined;
      throw e;
    }
  },

  async create(input: CreateCaseInput): Promise<CaseRecord> {
    const row = await apiClient<ApiCase>("/cases", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return mapCase(row, null, input.uid);
  },

  async resendLink(id: string): Promise<{ linkExpiry: string | null }> {
    const row = await apiClient<ApiCase>(`/cases/${id}/resend-link`, { method: "PATCH" });
    return { linkExpiry: row.linkExpiry ?? null };
  },
};

export const apiAuditService = {
  async list(params: AuditListParams = {}): Promise<PaginatedResult<AuditEvent>> {
    const result = await apiListWithMeta<ApiAuditEvent>("/audit-log", toAuditListQuery(params));
    return { ...result, data: result.data.map(mapAuditEvent) };
  },

  async exportCsv(params: Omit<AuditListParams, "page" | "limit" | "grouped"> = {}): Promise<void> {
    await downloadApiCsv("/audit-log/export", toAuditListQuery(params), "cedarrose-audit-log.csv");
  },
};

export const apiCompaniesService = {
  async getByUid(uid: string): Promise<CompanyData> {
    const row = await apiClient<ApiCompany>(`/companies/${encodeURIComponent(uid)}`);
    return mapCompany(row);
  },
};

function buildUserPayload(user: User) {
  const { firstName, lastName } = splitName(user.name);
  return { firstName, lastName, email: user.email, role: toApiRole(user.role) };
}

export const apiUsersService = {
  async list(): Promise<User[]> {
    const rows = await fetchPaginated<ApiUser>("/admin/users");
    return rows.map(mapUser);
  },

  async save(users: User[]): Promise<User[]> {
    const current = await apiUsersService.list();
    const currentById = new Map(current.map((u) => [u.id, u]));
    const nextIds = new Set(users.map((u) => u.id));

    for (const existing of current) {
      if (!nextIds.has(existing.id)) {
        await apiClient<null>(`/admin/users/${existing.id}`, { method: "DELETE" });
      }
    }

    for (const user of users) {
      if (isLocalUserId(user.id) || !currentById.has(user.id)) {
        await apiClient<ApiUser>("/admin/users/invite", {
          method: "POST",
          body: JSON.stringify(buildUserPayload(user)),
        });
        continue;
      }

      const prev = currentById.get(user.id)!;
      if (
        prev.name !== user.name ||
        prev.email !== user.email ||
        prev.role !== user.role ||
        prev.status !== user.status
      ) {
        await apiClient<ApiUser>(`/admin/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...buildUserPayload(user),
            status: user.status === "Pending" ? "Pending" : user.status,
          }),
        });
      }
    }

    return apiUsersService.list();
  },
};

export const apiTemplatesService = {
  async list(): Promise<Template[]> {
    const rows = await apiClient<ApiTemplate[]>("/admin/templates");
    return rows.map((t) => mapTemplate(t));
  },

  async getById(id: string): Promise<Template> {
    const row = await apiClient<ApiTemplate>(`/admin/templates/${id}`);
    return mapTemplate(row);
  },

  async create(input: {
    name: string;
    recipientType: Template["recipientType"];
    sections?: Template["sections"];
  }): Promise<Template> {
    const body = {
      name: input.name,
      recipientType: input.recipientType,
      sections: input.sections?.length
        ? mapTemplateToApi({
            id: "",
            name: input.name,
            recipientType: input.recipientType,
            status: "Draft",
            lastEdited: "",
            editor: "",
            sections: input.sections,
          }).sections
        : undefined,
    };
    const row = await apiClient<ApiTemplate>("/admin/templates", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return mapTemplate(row);
  },

  async save(template: Template): Promise<Template> {
    const body = mapTemplateToApi(template);
    const row = await apiClient<ApiTemplate>(`/admin/templates/${template.id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return mapTemplate(row);
  },

  async updateStatus(id: string, status: Template["status"]): Promise<Template> {
    const row = await apiClient<ApiTemplate>(`/admin/templates/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return mapTemplate(row);
  },

  async delete(id: string): Promise<void> {
    await apiClient<null>(`/admin/templates/${id}`, { method: "DELETE" });
  },

  /** @deprecated Use save() for a single template */
  async saveAll(templates: Template[]): Promise<Template[]> {
    for (const template of templates) {
      const body = mapTemplateToApi(template);
      if (isLocalTemplateId(template.id)) {
        await apiClient<ApiTemplate>("/admin/templates", {
          method: "POST",
          body: JSON.stringify(body),
        });
      } else {
        await apiClient<ApiTemplate>(`/admin/templates/${template.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      }
    }
    return apiTemplatesService.list();
  },
};

export const apiConfigService = {
  async get(): Promise<PlatformConfig> {
    const row = await apiClient<ApiPlatformConfig>("/admin/config");
    return mapPlatformConfig(row);
  },

  async save(config: PlatformConfig): Promise<PlatformConfig> {
    const row = await apiClient<ApiPlatformConfig>("/admin/config", {
      method: "PUT",
      body: JSON.stringify(mapPlatformConfigToApi(config)),
    });
    return mapPlatformConfig(row);
  },
};

export const apiNotificationsService = {
  async list(): Promise<Notification[]> {
    const rows = await fetchPaginated<ApiNotification>("/notifications");
    return rows.map(mapNotification);
  },

  async markRead(id: string): Promise<void> {
    await apiClient<null>(`/notifications/${id}/read`, { method: "PATCH" });
  },

  async markAllRead(): Promise<void> {
    await apiClient<null>("/notifications/read-all", { method: "PATCH" });
  },

  async save(notifications: Notification[]): Promise<Notification[]> {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === notifications.length) {
      await apiNotificationsService.markAllRead();
    } else {
      await Promise.all(unread.map((n) => apiNotificationsService.markRead(n.id)));
    }
    return apiNotificationsService.list();
  },
};

export { ApiError };

export const apiDashboardService = {
  async getCompletionStats(period: import("@/types/dashboard").DashboardPeriod) {
    return apiClient<import("@/types/dashboard").CompletionStats>(
      `/dashboard/completion-stats?period=${period}`
    );
  },
};
