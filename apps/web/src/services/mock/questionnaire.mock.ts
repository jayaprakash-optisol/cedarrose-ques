import type {
  LinkVerifyResult,
  QuestionnaireSession,
  FormResponse,
  QuestionnaireFormData,
} from "@/types/questionnaire";
import type { Template } from "@/types";
import { delay } from "./utils";
import { mockTemplatesService } from "./templates.mock";

// ---------------------------------------------------------------------------
// In-memory session state (simulates server-side OTP storage)
// ---------------------------------------------------------------------------
interface SessionEntry {
  caseId: string;
  otp: string;
  email: string;
}
const sessionStore = new Map<string, SessionEntry>();
const responseStore = new Map<string, FormResponse[]>(); // keyed by caseId

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local[0]}***@${domain}`;
}

function buildFormData(tpl: Template, caseId: string): QuestionnaireFormData {
  return {
    case: {
      caseId,
      subjectName: "Acme Trading LLC",
      recipientType: "Supplier",
      status: "IN PROGRESS",
      currentStep: 9,
    },
    template: {
      id: tpl.id,
      name: tpl.name,
      sections: tpl.sections ?? [],
    },
    savedResponses: responseStore.get(caseId) ?? [],
  };
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------
export interface QuestionnaireService {
  verifyLink(token: string): Promise<LinkVerifyResult>;
  requestOtp(token: string): Promise<void>;
  verifyOtp(token: string, otp: string): Promise<QuestionnaireSession>;
  getForm(token: string, sessionToken: string): Promise<QuestionnaireFormData>;
  saveProgress(token: string, sessionToken: string, responses: FormResponse[]): Promise<void>;
  submit(token: string, sessionToken: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Mock implementation
// ---------------------------------------------------------------------------
export const mockQuestionnaireService: QuestionnaireService = {
  async verifyLink(token) {
    await delay(400);
    const recipientEmail = "supplier@acmetrading.ae";
    // Simulate expired link check: token "expired" always fails
    if (token === "expired") {
      throw new Error("Link expired");
    }
    return {
      caseId: "c-001",
      subjectName: "Acme Trading LLC",
      recipientType: "Supplier",
      status: "SENT",
      maskedEmail: maskEmail(recipientEmail),
    };
  },

  async requestOtp(token) {
    await delay(600);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    sessionStore.set(token, { caseId: "c-001", otp, email: "supplier@acmetrading.ae" });
  },

  async verifyOtp(token, otp) {
    await delay(500);
    const session = sessionStore.get(token);
    if (!session) throw new Error("Session expired. Please request a new OTP.");
    if (session.otp !== otp) throw new Error("Invalid OTP. Please try again.");
    return {
      sessionToken: `mock-session-${token}`,
      caseId: session.caseId,
      rawToken: token,
    };
  },

  async getForm(_token, _sessionToken) {
    await delay(400);
    // getById includes full sections; list() strips them
    const tpl = await mockTemplatesService.getById("tpl-1").catch(async () => {
      const templates = await mockTemplatesService.list();
      if (templates.length === 0) throw new Error("No templates available");
      return mockTemplatesService.getById(templates[0].id);
    });
    return buildFormData(tpl, "c-001");
  },

  async saveProgress(_token, _sessionToken, responses) {
    await delay(300);
    responseStore.set("c-001", responses);
  },

  async submit(_token, _sessionToken) {
    await delay(600);
    responseStore.delete("c-001");
  },
};
