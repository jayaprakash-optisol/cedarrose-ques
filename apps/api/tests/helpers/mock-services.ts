import { vi } from "vitest";
import type { AuditService } from "../../src/modules/audit/audit.service.js";
import type { NotificationsService } from "../../src/modules/notifications/notifications.service.js";

export function createMockAuditService(): AuditService {
  return {
    log: vi.fn().mockResolvedValue({}),
    list: vi.fn(),
    export: vi.fn(),
  } as unknown as AuditService;
}

export function createMockNotificationsService(): NotificationsService {
  return {
    list: vi.fn(),
    create: vi.fn(),
    notifySubmission: vi.fn(),
    notifyReviewApproved: vi.fn(),
    notifyExpired: vi.fn(),
    notifyStale: vi.fn(),
    sendReminder: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    delete: vi.fn(),
  } as unknown as NotificationsService;
}

export function createMockDb() {
  return {
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  };
}
