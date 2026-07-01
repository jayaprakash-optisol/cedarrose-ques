import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  fetchCurrentUser,
  completeLogin,
  completeLogout,
  clearLegacyTokenStorage,
  refreshCurrentUser,
  CURRENT_USER_QUERY_KEY,
} from "@/lib/auth-session";
import { ApiError } from "@/services/api/errors";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/services", () => ({
  authService: {
    getCurrentUser: mocks.getCurrentUser,
    login: mocks.login,
    logout: mocks.logout,
  },
}));

vi.mock("@/config/env", () => ({
  env: { apiBaseUrl: "/api/v1" },
}));

vi.mock("@/lib/app-selection", () => ({
  clearAppSelected: vi.fn(),
}));

describe("auth-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("clearLegacyTokenStorage", () => {
    it("removes legacy bearer token from localStorage", () => {
      localStorage.setItem("cedarrose_access_token", "legacy");
      clearLegacyTokenStorage();
      expect(localStorage.getItem("cedarrose_access_token")).toBeNull();
    });
  });

  describe("fetchCurrentUser", () => {
    it("returns null on 401 without throwing", async () => {
      mocks.getCurrentUser.mockRejectedValue(new ApiError("AUTH", "Unauthorized", 401));
      await expect(fetchCurrentUser()).resolves.toBeNull();
    });

    it("returns null on 304 and invalid json codes", async () => {
      mocks.getCurrentUser.mockRejectedValue(new ApiError("AUTH", "Not modified", 304));
      await expect(fetchCurrentUser()).resolves.toBeNull();
      mocks.getCurrentUser.mockRejectedValue(new ApiError("INVALID_JSON", "Bad json", 200));
      await expect(fetchCurrentUser()).resolves.toBeNull();
      mocks.getCurrentUser.mockRejectedValue(new ApiError("EMPTY_RESPONSE", "Empty", 200));
      await expect(fetchCurrentUser()).resolves.toBeNull();
    });

    it("returns user when authenticated", async () => {
      const user = {
        id: "1",
        email: "a@b.com",
        name: "A",
        role: "analyst" as const,
        title: "Analyst",
        initials: "TA",
      };
      mocks.getCurrentUser.mockResolvedValue(user);
      await expect(fetchCurrentUser()).resolves.toEqual(user);
    });

    it("returns null when API is unreachable", async () => {
      mocks.getCurrentUser.mockRejectedValue(new TypeError("fetch failed"));
      await expect(fetchCurrentUser()).resolves.toBeNull();
    });

    it("rethrows unexpected API errors", async () => {
      mocks.getCurrentUser.mockRejectedValue(new ApiError("SERVER", "Boom", 500));
      await expect(fetchCurrentUser()).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe("completeLogin", () => {
    it("stores user in query cache after login", async () => {
      const user = {
        id: "1",
        email: "a@b.com",
        name: "A",
        role: "analyst" as const,
        title: "Analyst",
        initials: "TA",
      };
      mocks.login.mockResolvedValue(user);
      mocks.getCurrentUser.mockResolvedValue(user);

      const queryClient = new QueryClient();
      const setQueryData = vi.spyOn(queryClient, "setQueryData");

      await completeLogin(queryClient, "a@b.com", "pass");

      expect(mocks.login).toHaveBeenCalledWith("a@b.com", "pass", false);
      expect(setQueryData).toHaveBeenCalledWith(CURRENT_USER_QUERY_KEY, user);
    });

    it("removes non-current-user queries via the predicate", async () => {
      const user = {
        id: "1",
        email: "a@b.com",
        name: "A",
        role: "analyst" as const,
        title: "Analyst",
        initials: "TA",
      };
      mocks.login.mockResolvedValue(user);
      mocks.getCurrentUser.mockResolvedValue(user);

      const queryClient = new QueryClient();
      queryClient.setQueryData(["cases"], [{ id: "c1" }]);
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, { stale: true });
      const removeQueries = vi.spyOn(queryClient, "removeQueries");

      await completeLogin(queryClient, "a@b.com", "pass");

      expect(removeQueries).toHaveBeenCalled();
      expect(queryClient.getQueryData(["cases"])).toBeUndefined();
      expect(queryClient.getQueryData(CURRENT_USER_QUERY_KEY)).toEqual(user);
    });

    it("skips verified refresh when fetch returns null", async () => {
      const user = {
        id: "1",
        email: "a@b.com",
        name: "A",
        role: "analyst" as const,
        title: "Analyst",
        initials: "TA",
      };
      mocks.login.mockResolvedValue(user);
      mocks.getCurrentUser.mockResolvedValue(null);

      const queryClient = new QueryClient();
      await completeLogin(queryClient, "a@b.com", "pass");
      expect(queryClient.getQueryData(CURRENT_USER_QUERY_KEY)).toEqual(user);
    });
  });

  describe("refreshCurrentUser", () => {
    it("fetches current user into cache", async () => {
      const user = {
        id: "1",
        email: "a@b.com",
        name: "A",
        role: "analyst" as const,
        title: "Analyst",
        initials: "TA",
      };
      mocks.getCurrentUser.mockResolvedValue(user);
      const queryClient = new QueryClient();
      await refreshCurrentUser(queryClient);
      expect(queryClient.getQueryData(CURRENT_USER_QUERY_KEY)).toEqual(user);
    });
  });

  describe("completeLogout", () => {
    it("clears session and calls logout API", async () => {
      const queryClient = new QueryClient();
      const setQueryData = vi.spyOn(queryClient, "setQueryData");
      mocks.logout.mockResolvedValue(undefined);

      await completeLogout(queryClient);

      expect(mocks.logout).toHaveBeenCalledOnce();
      expect(setQueryData).toHaveBeenCalledWith(CURRENT_USER_QUERY_KEY, null);
    });
  });
});
