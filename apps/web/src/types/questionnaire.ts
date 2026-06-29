import type { RecipientType } from "./case";
import type { Section } from "./template";

/** Result of POST /questionnaire/verify-link */
export interface LinkVerifyResult {
  caseId: string;
  subjectName: string;
  recipientType: RecipientType;
  status: string;
  maskedEmail: string;
}

/** Stored in sessionStorage after OTP verification */
export interface QuestionnaireSession {
  sessionToken: string;
  caseId: string;
  rawToken: string;
}

/** State persisted to sessionStorage before OTP step */
export interface QSessionState {
  caseId: string;
  subjectName: string;
  recipientType: string;
  maskedEmail: string;
  sessionToken?: string;
  savedAt?: string;
}

/** Single saved response entry */
export interface FormResponse {
  questionId: string;
  sectionId: string;
  question: string;
  answer: string;
  mandatory: boolean;
}

/** Full payload returned by GET /questionnaire/:token/form */
export interface QuestionnaireFormData {
  case: {
    caseId: string;
    subjectName: string;
    recipientType: string;
    status: string;
    currentStep: number;
  };
  template: {
    id: string;
    name: string;
    sections: Section[];
  };
  savedResponses?: FormResponse[];
}
