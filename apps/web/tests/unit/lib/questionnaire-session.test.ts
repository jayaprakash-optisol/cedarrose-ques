import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  questionnaireSessionKey,
  isSessionExpiredError,
  clearQuestionnaireSessionToken,
} from "@/lib/questionnaire-session";
import { ApiError } from "@/services/api/errors";

describe("questionnaire-session", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe("questionnaireSessionKey", () => {
    it("builds the session storage key from the token", () => {
      expect(questionnaireSessionKey("abc123")).toBe("q_session_abc123");
    });
  });

  describe("isSessionExpiredError", () => {
    it("returns true for ApiError with SESSION_EXPIRED code", () => {
      expect(isSessionExpiredError(new ApiError("SESSION_EXPIRED", "expired", 401))).toBe(true);
    });

    it("returns false for other ApiError codes", () => {
      expect(isSessionExpiredError(new ApiError("OTHER", "nope", 500))).toBe(false);
    });

    it("returns false for non-ApiError values", () => {
      expect(isSessionExpiredError(new Error("plain"))).toBe(false);
      expect(isSessionExpiredError("string")).toBe(false);
      expect(isSessionExpiredError(null)).toBe(false);
    });
  });

  describe("clearQuestionnaireSessionToken", () => {
    it("removes sessionToken from the stored payload", () => {
      const key = questionnaireSessionKey("tkn");
      sessionStorage.setItem(
        key,
        JSON.stringify({ sessionToken: "jwt", otherField: "keep" }),
      );

      clearQuestionnaireSessionToken("tkn");

      const stored = JSON.parse(sessionStorage.getItem(key) ?? "{}");
      expect(stored.sessionToken).toBeUndefined();
      expect(stored.otherField).toBe("keep");
    });

    it("is a no-op when no entry exists", () => {
      const setSpy = vi.spyOn(Storage.prototype, "setItem");
      clearQuestionnaireSessionToken("missing");
      expect(setSpy).not.toHaveBeenCalled();
    });

    it("removes the key when stored JSON is corrupt", () => {
      const key = questionnaireSessionKey("broken");
      sessionStorage.setItem(key, "not-json");
      const removeSpy = vi.spyOn(Storage.prototype, "removeItem");

      clearQuestionnaireSessionToken("broken");

      expect(removeSpy).toHaveBeenCalledWith(key);
    });
  });
});
