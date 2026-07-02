import { vi } from "vitest";

export const noop = vi.fn(() => Promise.resolve(undefined));
export const noopResolved = vi.fn().mockResolvedValue(undefined);
export const noopList = vi.fn().mockResolvedValue([]);

export function mockServicesFactory() {
  return {
    auditService: { list: noopList, exportCsv: noop },
    casesService: { list: noopList, getById: noop, create: noop, exportCsv: noop, resendLink: noopResolved },
    notificationsService: { list: noopList, markRead: noopResolved, markAllRead: noopResolved, save: noopResolved },
    authService: { login: noop, logout: noopResolved, getCurrentUser: noop, verifyInvitation: noop, completeRegistration: noop, forgotPassword: noopResolved, verifyResetToken: noop, resetPassword: noopResolved },
    settingsService: { get: noop, save: noop, changePassword: noopResolved },
    companiesService: { getByUid: noop },
    companyRequestsService: { listPending: noopList, getById: noop },
    usersService: { list: noopList, save: noop },
    templatesService: { list: noopList, getById: noop, create: noop, save: noop, updateStatus: noop, delete: noopResolved, saveAll: noop },
    configService: { get: noop, save: noop },
    dashboardService: { getCompletionStats: noop },
    questionnaireService: { verifyLink: noop, requestOtp: noopResolved, verifyOtp: noop, getForm: noop, saveProgress: noopResolved, submit: noopResolved },
  };
}
