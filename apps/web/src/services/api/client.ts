import type { CaseRecord } from "@/types";
import type { AuditEvent } from "@/types";
import type { CompanyData } from "@/types";
import type { User } from "@/types";
import type { Template } from "@/types";
import type { PlatformConfig } from "@/types";
import type { Notification } from "@/types";
import type { CurrentUser } from "@/types";
import type { InvitationInfo } from "@/types/user";
import type { RecipientType } from "@/types/case";
import { env } from "@/config/env";
import { ApiError, type ApiEnvelope } from "./errors";
import {
  mapAuditEvent,
  mapCase,
  mapCompany,
  mapCurrentUser,
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

async function parseJson<T>(res: Response): Promise<ApiEnvelope<T>> {
  try {
    return (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError("INVALID_JSON", "Invalid response from server", res.status);
  }
}

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

  const body = await parseJson<T>(res);

  if (!body.success) {
    const code = body.error?.code ?? "ERROR";
    const message = body.error?.message ?? res.statusText;
    throw new ApiError(code, message, res.status);
  }

  return body.data as T;
}

async function fetchPaginated<T>(path: string, limit = 100): Promise<T[]> {
  const first = await apiClient<T[]>(`${path}${path.includes("?") ? "&" : "?"}page=1&limit=${limit}`);
  return first ?? [];
}

export interface CreateCaseInput {
  orderId: string;
  uid?: string;
  subjectName: string;
  country: string;
  recipientType: RecipientType;
  recipientEmail?: string;
  linkValidityHours?: number;
  templateId?: string;
  analystId?: string;
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
};

export const apiCasesService = {
  async list(): Promise<CaseRecord[]> {
    const rows = await fetchPaginated<ApiCase>("/cases");
    return rows.map((c) => mapCase(c));
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

  async resendLink(id: string): Promise<void> {
    await apiClient<ApiCase>(`/cases/${id}/resend-link`, { method: "PATCH" });
  },
};

export const apiAuditService = {
  async list(params?: { caseId?: string }): Promise<AuditEvent[]> {
    const qs = new URLSearchParams({ page: "1", limit: "100" });
    if (params?.caseId) qs.set("caseId", params.caseId);
    const rows = await apiClient<ApiAuditEvent[]>(`/audit-log?${qs}`);
    return rows.map(mapAuditEvent);
  },
};

export const apiCompaniesService = {
  async getByUid(uid: string): Promise<CompanyData> {
    const row = await apiClient<ApiCompany>(`/companies/${encodeURIComponent(uid)}`);
    return mapCompany(row);
  },
};

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
        const { firstName, lastName } = splitName(user.name);
        await apiClient<ApiUser>("/admin/users/invite", {
          method: "POST",
          body: JSON.stringify({
            firstName,
            lastName,
            email: user.email,
            role: toApiRole(user.role),
          }),
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
        const { firstName, lastName } = splitName(user.name);
        await apiClient<ApiUser>(`/admin/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            firstName,
            lastName,
            email: user.email,
            role: toApiRole(user.role),
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
