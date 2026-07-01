import { apiClient } from "./client";
import { mapQuestionnaireFormData, type ApiQuestionnaireFormPayload } from "./mappers";
import type { QuestionnaireService } from "../types";
import type {
  LinkVerifyResult,
  QuestionnaireSession,
  FormResponse,
} from "@/types/questionnaire";

export const apiQuestionnaireService: QuestionnaireService = {
  async verifyLink(token) {
    return apiClient<LinkVerifyResult>("/questionnaire/verify-link", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  async requestOtp(token) {
    await apiClient("/questionnaire/authenticate", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  async verifyOtp(token, otp) {
    const res = await apiClient<{ sessionToken: string; caseId: string }>(
      "/questionnaire/otp-verify",
      { method: "POST", body: JSON.stringify({ token, otp }) }
    );
    const session: QuestionnaireSession = {
      sessionToken: res.sessionToken,
      caseId: res.caseId,
      rawToken: token,
    };
    return session;
  },

  async getForm(token, sessionToken) {
    const raw = await apiClient<ApiQuestionnaireFormPayload>(`/questionnaire/${token}/form`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    return mapQuestionnaireFormData(raw);
  },

  async saveProgress(token, sessionToken, responses: FormResponse[]) {
    await apiClient(`/questionnaire/${token}/save`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify({ responses }),
    });
  },

  async submit(token, sessionToken) {
    await apiClient(`/questionnaire/${token}/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
  },
};
