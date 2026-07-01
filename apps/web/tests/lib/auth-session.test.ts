import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/api/client";
import { authService } from "@/services";
import {
  CURRENT_USER_QUERY_KEY,
  clearLegacyTokenStorage,
  completeLogin,
  completeLogout,
  fetchCurrentUser,
  refreshCurrentUser,
} from "@/lib/auth-session";

const LEGACY_KEY = "cedarrose_access_token";

function makeQueryClient() {
  return {
    fetchQuery: vi.fn(),
    setQueryData: vi.fn(),
    removeQueries: vi.fn(),
  } as unknown as QueryClient & {
    fetchQuery: ReturnType<typeof vi.fn>;
    setQueryData: ReturnType<typeof vi.fn>;
    removeQueries: ReturnType<typeof vi.fn>;
  };
}

describe("auth-session", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  describe("CURRENT_USER_QUERY_KEY", () => {
    it("exposes the canonical query key", () => {
      expect(CURRENT_USER_QUERY_KEY).toEqual(["current-user"]);
    });
  });

  describe("clearLegacyTokenStorage", () => {
    it("removes the legacy token key from localStorage", () => {
      localStorage.setItem(LEGACY_KEY, "old-token");
      clearLegacyTokenStorage();
      expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    });

    it("swallows errors thrown by localStorage", () => {
      const removeItem = vi
        .spyOn(Storage.prototype, "removeItem")
        .mockImplementation(() => {
          throw new Error("quota");
        });
      expect(() => clearLegacyTokenStorage()).not.toThrow();
      removeItem.mockRestore();
    });
  });

  describe("fetchCurrentUser", () => {
    it("returns the user when authService resolves", async () => {
      const user = { id: "u1", name: "Jane", email: "j@e.com", role: "admin" as const, title: "t", initials: "J" };
      vi.spyOn(authService, "getCurrentUser").mockResolvedValue(user);
      await expect(fetchCurrentUser()).resolves.toEqual(user);
    });

    it("returns null when authService throws a TypeError (network down)", async () => {
      vi.spyOn(authService, "getCurrentUser").mockRejectedValue(new TypeError("network"));
      await expect(fetchCurrentUser()).resolves.toBeNull();
    });

    it("returns null on 401 ApiError", async () => {
      vi.spyOn(authService, "getCurrentUser").mockRejectedValue(new ApiError("UNAUTHORIZED", "no", 401));
      await expect(fetchCurrentUser()).resolves.toBeNull();
    });

    it("returns null on 304 ApiError", async () => {
      vi.spyOn(authService, "getCurrentUser").mockRejectedValue(new ApiError("NOT_MODIFIED", "no", 304));
      await expect(fetchCurrentUser()).resolves.toBeNull();
    });

    it("returns null on INVALID_JSON ApiError", async () => {
      vi.spyOn(authService, "getCurrentUser").mockRejectedValue(new ApiError("INVALID_JSON", "bad", 500));
      await expect(fetchCurrentUser()).resolves.toBeNull();
    });

    it("returns null on EMPTY_RESPONSE ApiError", async () => {
      vi.spyOn(authService, "getCurrentUser").mockRejectedValue(new ApiError("EMPTY_RESPONSE", "empty", 204));
      await expect(fetchCurrentUser()).resolves.toBeNull();
    });

    it("rethrows other ApiErrors", async () => {
      const err = new ApiError("SERVER_ERROR", "boom", 500);
      vi.spyOn(authService, "getCurrentUser").mockRejectedValue(err);
      await expect(fetchCurrentUser()).rejects.toBe(err);
    });

    it("rethrows non-ApiError, non-TypeError errors", async () => {
      const err = new Error("boom");
      vi.spyOn(authService, "getCurrentUser").mockRejectedValue(err);
      await expect(fetchCurrentUser()).rejects.toBe(err);
    });
  });

  describe("refreshCurrentUser", () => {
    it("calls queryClient.fetchQuery with the current-user key and staleTime=0", async () => {
      const qc = makeQueryClient();
      const user = { id: "u1", name: "Jane", email: "j@e.com", role: "admin" as const, title: "t", initials: "J" };
      (qc.fetchQuery as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      const out = await refreshCurrentUser(qc);
      expect(qc.fetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: CURRENT_USER_QUERY_KEY,
          queryFn: fetchCurrentUser,
          staleTime: 0,
        }),
      );
      expect(out).toEqual(user);
    });
  });

  describe("completeLogin", () => {
    it("logs in, clears the legacy token, and sets query data", async () => {
      localStorage.setItem(LEGACY_KEY, "old");
      const user = { id: "u1", name: "Jane", email: "j@e.com", role: "admin" as const, title: "t", initials: "J" };
      const verified = { ...user, name: "Jane Doe" };
      const loginSpy = vi.spyOn(authService, "login").mockResolvedValue(user);
      const fetchSpy = vi.spyOn(authService, "getCurrentUser").mockResolvedValue(verified);
      const qc = makeQueryClient();

      await completeLogin(qc, "  j@e.com  ", "secret");

      expect(loginSpy).toHaveBeenCalledWith("j@e.com", "secret", false);
      expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
      expect(qc.removeQueries).toHaveBeenCalledWith(
        expect.objectContaining({
          predicate: expect.any(Function),
        }),
      );

      // Invoke the captured predicate to exercise the inline arrow function.
      const removeArgs = (qc.removeQueries.mock.calls[0] as unknown[])[0] as {
        predicate: (query: { queryKey: readonly unknown[] }) => boolean;
      };
      expect(removeArgs.predicate({ queryKey: ["current-user"] })).toBe(false);
      expect(removeArgs.predicate({ queryKey: ["something-else"] })).toBe(true);

      expect(qc.setQueryData).toHaveBeenCalledWith(CURRENT_USER_QUERY_KEY, user);
      expect(qc.setQueryData).toHaveBeenCalledWith(CURRENT_USER_QUERY_KEY, verified);
      expect(fetchSpy).toHaveBeenCalled();
    });

    it("skips the verified update when fetchCurrentUser returns null", async () => {
      const user = { id: "u1", name: "Jane", email: "j@e.com", role: "admin" as const, title: "t", initials: "J" };
      vi.spyOn(authService, "login").mockResolvedValue(user);
      vi.spyOn(authService, "getCurrentUser").mockResolvedValue(null as never);
      const qc = makeQueryClient();
      await completeLogin(qc, "j@e.com", "secret");
      // The second setQueryData with the verified user is skipped.
      expect(qc.setQueryData).toHaveBeenCalledWith(CURRENT_USER_QUERY_KEY, user);
      const callsWithNull = (qc.setQueryData.mock.calls as unknown[][]).filter(
        (c) => c[1] === null,
      );
      expect(callsWithNull).toHaveLength(0);
    });
  });

  describe("completeLogout", () => {
    it("clears storage, calls logout, sets null user, and removes queries", async () => {
      localStorage.setItem(LEGACY_KEY, "old");
      sessionStorage.setItem("cedarrose_app_selected", "questionnaire");
      const logoutSpy = vi.spyOn(authService, "logout").mockResolvedValue();
      const qc = makeQueryClient();

      await completeLogout(qc);

      expect(logoutSpy).toHaveBeenCalled();
      expect(sessionStorage.getItem("cedarrose_app_selected")).toBeNull();
      expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
      expect(qc.setQueryData).toHaveBeenCalledWith(CURRENT_USER_QUERY_KEY, null);
      expect(qc.removeQueries).toHaveBeenCalledWith();
    });
  });
});
