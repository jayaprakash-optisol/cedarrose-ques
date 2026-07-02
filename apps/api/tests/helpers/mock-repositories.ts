import { vi } from "vitest";
import type { UserNotificationPreferencesRepository } from "../../src/modules/auth/user-notification-preferences.repository.js";

export function createMockCasesRepository() {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getResponses: vi.fn(),
    getNextCaseRef: vi.fn(),
    incrementReminders: vi.fn(),
    findByLinkHash: vi.fn(),
    findByLinkTokenHash: vi.fn(),
    isLinkExpired: vi.fn(),
    findExpiredActive: vi.fn(),
    findByStatuses: vi.fn(),
    findStaleInProgress: vi.fn(),
    incrementRemindersSent: vi.fn(),
  };
}

export function createMockCompanyRequestsRepository() {
  return {
    upsert: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    markConsumed: vi.fn(),
  };
}

export function createMockTemplatesRepository() {
  return {
    findAllSummaries: vi.fn(),
    findById: vi.fn(),
    getFullTemplate: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    replaceSectionsAndQuestions: vi.fn(),
    saveSnapshot: vi.fn(),
    delete: vi.fn(),
    findActiveByRecipientType: vi.fn(),
  };
}

export function createMockAuditRepository() {
  return {
    insert: vi.fn(),
    findAll: vi.fn(),
    findGroupedByCase: vi.fn(),
    exportBatches: vi.fn(),
  };
}

export function createMockUsersRepository() {
  return {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    setPlatforms: vi.fn(),
    getPlatforms: vi.fn(),
    getLatestInvitation: vi.fn(),
    insertInvitation: vi.fn(),
    cancelInvitations: vi.fn(),
  };
}

export function createMockNotificationPreferencesRepository() {
  return {
    findByUserId: vi.fn().mockResolvedValue({
      notifyOnSubmission: true,
      notifyOnLinkExpiry: true,
      notifyOnBlockedDispatch: true,
      notifyOnRemindersSent: true,
    }),
    upsert: vi.fn().mockResolvedValue({
      notifyOnSubmission: true,
      notifyOnLinkExpiry: true,
      notifyOnBlockedDispatch: true,
      notifyOnRemindersSent: true,
    }),
  } as unknown as UserNotificationPreferencesRepository;
}

export function createMockQuestionnaireRepository() {
  return {
    setOtp: vi.fn(),
    getOtp: vi.fn(),
    incrementOtpAttempts: vi.fn(),
    clearOtp: vi.fn(),
    getResponses: vi.fn(),
    upsertResponses: vi.fn(),
  };
}

export function createMockDashboardRepository() {
  return {
    findCasesForStats: vi.fn(),
  };
}

export function createMockNotificationsRepository() {
  return {
    findByUser: vi.fn(),
    create: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    delete: vi.fn(),
  };
}

export function createMockConfigRepository() {
  return {
    get: vi.fn(),
    replace: vi.fn(),
  };
}
