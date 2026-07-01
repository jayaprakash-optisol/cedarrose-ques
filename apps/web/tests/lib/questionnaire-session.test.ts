import { describe, expect, it } from "vitest";
import { ApiError } from "@/services/api/errors";
import {
  clearQuestionnaireSessionToken,
  isSessionExpiredError,
  questionnaireSessionKey,
} from "@/lib/questionnaire-session";

describe("questionnaire-session", () => {
  describe("questionnaireSessionKey", () => {
    it("returns the sessionStorage key for a token", () => {
      expect(questionnaireSessionKey("abc123")).toBe("q_session_abc123");
    });
  });

  describe("isSessionExpiredError", () => {
    it("returns true when error is an ApiError with SESSION_EXPIRED code", () => {
      const err = new ApiError("SESSION_EXPIRED", "expired", 401);
      expect(isSessionExpiredError(err)).toBe(true);
    });

    it("returns false when error is an ApiError with a different code", () => {
      const err = new ApiError("OTHER", "other", 401);
      expect(isSessionExpiredError(err)).toBe(false);
    });

    it("returns false when error is not an ApiError", () => {
      expect(isSessionExpiredError(new Error("boom"))).toBe(false);
      expect(isSessionExpiredError("SESSION_EXPIRED")).toBe(false);
      expect(isSessionExpiredError(null)).toBe(false);
    });
  });

  describe("clearQuestionnaireSessionToken", () => {
    it("does nothing when no value is stored", () => {
      clearQuestionnaireSessionToken("missing-token");
      expect(sessionStorage.getItem("q_session_missing-token")).toBeNull();
    });

    it("removes the entry when stored value is not valid JSON", () => {
      sessionStorage.setItem("q_session_bad", "not-json");
      clearQuestionnaireSessionToken("bad");
      expect(sessionStorage.getItem("q_session_bad")).toBeNull();
    });

    it("removes the sessionToken from a stored JSON object", () => {
      sessionStorage.setItem(
        "q_session_tok1",
        JSON.stringify({ sessionToken: "secret", other: "keep" }),
      );
      clearQuestionnaireSessionToken("tok1");
      const after = JSON.parse(sessionStorage.getItem("q_session_tok1")!);
      expect(after.sessionToken).toBeUndefined();
      expect(after.other).toBe("keep");
    });
  });
});
