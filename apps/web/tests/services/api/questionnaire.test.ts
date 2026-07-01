import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiQuestionnaireService } from "@/services/api/questionnaire";

describe("api/questionnaire", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const ok = (data: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
      ...init,
    });

  describe("verifyLink", () => {
    it("POSTs to /questionnaire/verify-link with the token", async () => {
      const data = {
        caseId: "c1",
        subjectName: "Acme",
        recipientType: "Supplier",
        status: "SENT",
        maskedEmail: "a***@example.com",
      };
      fetchMock.mockResolvedValueOnce(ok(data));
      const out = await apiQuestionnaireService.verifyLink("tok-1");
      expect(out).toEqual(data);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/questionnaire/verify-link",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ token: "tok-1" }),
        }),
      );
    });
  });

  describe("requestOtp", () => {
    it("POSTs to /questionnaire/authenticate and returns void", async () => {
      fetchMock.mockResolvedValueOnce(ok(null));
      await apiQuestionnaireService.requestOtp("tok-1");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/questionnaire/authenticate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ token: "tok-1" }),
        }),
      );
    });
  });

  describe("verifyOtp", () => {
    it("POSTs to /questionnaire/otp-verify and assembles the session", async () => {
      fetchMock.mockResolvedValueOnce(
        ok({ sessionToken: "st", caseId: "c1" }),
      );
      const session = await apiQuestionnaireService.verifyOtp("tok-1", "1234");
      expect(session).toEqual({
        sessionToken: "st",
        caseId: "c1",
        rawToken: "tok-1",
      });
    });
  });

  describe("getForm", () => {
    it("GETs the form with the Authorization bearer header", async () => {
      const formData = {
        case: { caseId: "c1", subjectName: "Acme", recipientType: "Supplier", status: "SENT" },
        template: { templateId: "t1", name: "Tpl", recipientType: "Supplier", status: "Active" },
      };
      fetchMock.mockResolvedValueOnce(ok(formData));
      await apiQuestionnaireService.getForm("tok-1", "sess-1");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/questionnaire/tok-1/form",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer sess-1",
          }),
        }),
      );
    });
  });

  describe("saveProgress", () => {
    it("POSTs responses to /questionnaire/:token/save", async () => {
      fetchMock.mockResolvedValueOnce(ok(null));
      const responses = [
        {
          questionId: "q1",
          sectionId: "s1",
          question: "Q?",
          answer: "A",
          mandatory: true,
        },
      ];
      await apiQuestionnaireService.saveProgress("tok-1", "sess-1", responses);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/questionnaire/tok-1/save",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ responses }),
        }),
      );
    });
  });

  describe("submit", () => {
    it("POSTs to /questionnaire/:token/submit with auth header", async () => {
      fetchMock.mockResolvedValueOnce(ok(null));
      await apiQuestionnaireService.submit("tok-1", "sess-1");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/questionnaire/tok-1/submit",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer sess-1",
          }),
        }),
      );
    });
  });
});
