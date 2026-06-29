import type { Notification } from "@/types";
import notificationsData from "@/mocks/data/notifications.json";
import { delay } from "./utils";

let notificationsCache: Notification[] | null = null;

function getNotifications(): Notification[] {
  if (!notificationsCache) notificationsCache = structuredClone(notificationsData as Notification[]);
  return notificationsCache;
}

export interface NotificationsService {
  list(): Promise<Notification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
  save(notifications: Notification[]): Promise<Notification[]>;
}

export const mockNotificationsService: NotificationsService = {
  async list() {
    await delay(100);
    return getNotifications();
  },
  async save(notifications) {
    notificationsCache = structuredClone(notifications);
    return notificationsCache;
  },
  async markRead(id) {
    const items = getNotifications();
    const idx = items.findIndex((n) => n.id === id);
    if (idx !== -1) items[idx] = { ...items[idx], read: true };
    notificationsCache = items;
  },
  async markAllRead() {
    notificationsCache = getNotifications().map((n) => ({ ...n, read: true }));
  },
};
