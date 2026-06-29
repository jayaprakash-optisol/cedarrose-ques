import type { CurrentUser, InvitationInfo } from "@/types";
import currentUserData from "@/mocks/data/current-user.json";
import { delay } from "./utils";

export interface AuthService {
  getCurrentUser(): Promise<CurrentUser>;
  login(email: string, password: string, rememberMe?: boolean): Promise<CurrentUser>;
  logout(): Promise<void>;
  verifyInvitation(token: string): Promise<InvitationInfo>;
  completeRegistration(token: string, password: string): Promise<void>;
}

export const mockAuthService: AuthService = {
  async getCurrentUser() {
    await delay(50);
    return currentUserData as CurrentUser;
  },
  async login() {
    await delay(150);
    return currentUserData as CurrentUser;
  },
  async logout() {
    await delay(50);
  },
  async verifyInvitation(token) {
    await delay(300);
    if (!token) throw new Error("Invalid or expired invitation");
    return {
      firstName: "Test",
      lastName: "User",
      email: "user@example.com",
      role: "Analyst",
    };
  },
  async completeRegistration() {
    await delay(500);
  },
};
