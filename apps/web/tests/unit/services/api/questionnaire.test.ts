import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiQuestionnaireService } from "@/services/api/questionnaire";

const mocks = vi.hoisted(() => ({
  apiClient: vi.fn(),
}));

vi.mock("@/services/api/client", () => ({
  apiClient: mocks.apiClient,
}));

describe("apiQuestionnaireService", () => {
  beforeEach(() => {
    mocks.apiClient.mockReset();
  });

  it("verifyLink posts token", async () => {
    const result = { caseId: "c-1", subjectName: "Acme", recipientType: "Supplier", maskedEmail: "a***@acme.com" };
    mocks.apiClient.mockResolvedValue(result);
    await expect(apiQuestionnaireService.verifyLink("tok-1")).resolves.toEqual(result);
    expect(mocks.apiClient).toHaveBeenCalledWith("/questionnaire/verify-link", {
      method: "POST",
      body: JSON.stringify({ token: "tok-1" }),
    });
  });

  it("requestOtp authenticates token", async () => {
    mocks.apiClient.mockResolvedValue(undefined);
    await apiQuestionnaireService.requestOtp("tok-1");
    expect(mocks.apiClient).toHaveBeenCalledWith("/questionnaire/authenticate", {
      method: "POST",
      body: JSON.stringify({ token: "tok-1" }),
    });
  });

  it("verifyOtp returns session with raw token", async () => {
    mocks.apiClient.mockResolvedValue({ sessionToken: "sess-1", caseId: "c-1" });
    const session = await apiQuestionnaireService.verifyOtp("tok-1", "123456");
    expect(session).toEqual({
      sessionToken: "sess-1",
      caseId: "c-1",
      rawToken: "tok-1",
    });
  });

  it("getForm maps questionnaire payload", async () => {
    mocks.apiClient.mockResolvedValue({
      case: { caseId: "c-1", subjectName: "Acme", recipientType: "Supplier", status: "SENT", currentStep: 1 },
      template: { id: "tpl-1", name: "Supplier", sections: [] },
      savedResponses: [],
    });
    const form = await apiQuestionnaireService.getForm("tok-1", "sess-1");
    expect(form.case.caseId).toBe("c-1");
    expect(mocks.apiClient).toHaveBeenCalledWith("/questionnaire/tok-1/form", {
      headers: { Authorization: "Bearer sess-1" },
    });
  });

  it("saveProgress posts responses with auth header", async () => {
    mocks.apiClient.mockResolvedValue(undefined);
    const responses = [{ questionId: "q1", sectionId: "s1", question: "Name", answer: "yes", mandatory: true }];
    await apiQuestionnaireService.saveProgress("tok-1", "sess-1", responses);
    expect(mocks.apiClient).toHaveBeenCalledWith("/questionnaire/tok-1/save", {
      method: "POST",
      headers: { Authorization: "Bearer sess-1" },
      body: JSON.stringify({ responses }),
    });
  });

  it("submit posts to submit endpoint", async () => {
    mocks.apiClient.mockResolvedValue(undefined);
    await apiQuestionnaireService.submit("tok-1", "sess-1");
    expect(mocks.apiClient).toHaveBeenCalledWith("/questionnaire/tok-1/submit", {
      method: "POST",
      headers: { Authorization: "Bearer sess-1" },
    });
  });
});
