export type CaseStatus =
  | "SENT"
  | "OPENED"
  | "IN PROGRESS"
  | "COMPLETED"
  | "COMPLETED — MISSING DATA"
  | "PENDING CONTACT"
  | "PENDING LINKAGE & CONTACT"
  | "EXPIRED"
  | "NOT SENT";

export type RecipientType = "Supplier" | "Customer" | "Partner" | "Business Analytics Report";

export type ResearcherStatus =
  | "Not Applicable"
  | "Awaiting Review"
  | "Approved"
  | "Flagged"
  | "Rejected";

export interface CompanyData {
  companyName: string;
  registrationNumber: string;
  country: string;
  riskRating: "Low" | "Medium" | "High";
  recipientEmails: string[];
  additionalFields: {
    incorporationDate: string;
    legalStructure: string;
    primaryIndustry: string;
  };
}

export interface QuestionnaireResponse {
  question: string;
  answer: string;
  mandatory: boolean;
  language?: string;
}

export interface CaseRecord {
  id: string;
  orderId: string;
  uid: string;
  subjectName: string;
  country: string;
  recipientType: RecipientType;
  status: CaseStatus;
  completionMandatory: { done: number; total: number };
  completionOptional: { done: number; total: number };
  requestedDate: string;
  lastActivity: string;
  researcherStatus: ResearcherStatus;
  researcherName?: string;
  researcherDecision?: "Approved" | "Flagged" | "Rejected";
  researcherNotes?: string;
  reviewDate?: string;
  apiPushStatus?: "Pending" | "Success" | "Failed";
  companyData: CompanyData;
  link: {
    sentAt?: string;
    firstOpenedAt?: string;
    otpValidatedAt?: string;
    expiresAt?: string;
    resentCount: number;
  };
  responses: QuestionnaireResponse[];
  currentStep: number;
  analyst: string;
  linkExpiry: string | null;
  /** Hours the questionnaire link stays valid (24–72). Set when the case is created. */
  linkValidityHours?: number;
  remindersSent: number | null;
  /** Maps step number (1–16) to ISO timestamp when that step completed. */
  stepTimestamps?: Record<number, string>;
  /** Returned once on case creation — the full /q/:token URL for the recipient. */
  linkUrl?: string | null;
}

export interface CaseListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CaseStatus | "All";
  recipientType?: RecipientType | "All";
  from?: string;
  to?: string;
}
