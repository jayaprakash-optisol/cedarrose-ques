import type { CurrentUser, NotificationPreferences } from "@/types";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/types/user";
import currentUserData from "@/mocks/data/current-user.json";
import { delay } from "./utils";

export interface SaveSettingsInput {
  name?: string;
  preferences?: Partial<NotificationPreferences>;
}

export interface SettingsService {
  get(): Promise<{ user: CurrentUser; preferences: NotificationPreferences }>;
  save(input: SaveSettingsInput): Promise<{ user: CurrentUser; preferences: NotificationPreferences }>;
  changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void>;
}

let mockUser: CurrentUser = { ...(currentUserData as CurrentUser) };
let mockPreferences: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };

export const mockSettingsService: SettingsService = {
  async get() {
    await delay(80);
    return { user: { ...mockUser }, preferences: { ...mockPreferences } };
  },

  async save(input) {
    await delay(200);
    if (input.name !== undefined) {
      mockUser = { ...mockUser, name: input.name.trim() };
    }
    if (input.preferences) {
      mockPreferences = { ...mockPreferences, ...input.preferences };
    }
    return { user: { ...mockUser }, preferences: { ...mockPreferences } };
  },

  async changePassword(currentPassword, newPassword, confirmPassword) {
    await delay(300);
    if (!currentPassword) throw new Error("Current password is required");
    if (newPassword.length < 8) throw new Error("New password must be at least 8 characters");
    if (newPassword !== confirmPassword) {
      throw new Error("New password and confirm password do not match");
    }
  },
};
