import type {
  CaseRecord,
  CompanyData,
  QuestionnaireResponse,
  ResearcherStatus,
} from "@/types/case";
import type { AuditEvent } from "@/types/audit";
import type { Notification } from "@/types/notification";
import type { PlatformConfig } from "@/types/config";
import type { QuestionnaireFormData } from "@/types/questionnaire";
import type { Template, Question, Section } from "@/types/template";
import type { CurrentUser, RoleKey, User } from "@/types/user";
import { absTime, relTime } from "@/lib/format";

export interface ApiUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  title?: string | null;
  initials?: string | null;
  totalReports?: number | null;
  score?: string | number | null;
  lastSubmission?: string | null;
  platforms?: { platform: string; role: string }[];
}

export interface ApiCase {
  caseId: string;
  caseRef: string;
  orderId: string;
  companyId?: string | null;
  subjectName: string;
  country: string;
  recipientType: CaseRecord["recipientType"];
  status: CaseRecord["status"];
  completionMandatory: number;
  completionOptional: number;
  dateSubmitted?: string | null;
  dateReceived: string;
  lastActivity?: string | null;
  analystId?: string | null;
  analystName?: string | null;
  assignedResearcherId?: string | null;
  researcherStatus?: string | null;
  researcherNotes?: string | null;
  researcherReviewedAt?: string | null;
  apiPushStatus?: CaseRecord["apiPushStatus"] | null;
  apiPushAt?: string | null;
  currentStep: number;
  linkExpiry?: string | null;
  linkValidityHours?: number;
  remindersSent?: number | null;
  resentCount?: number;
  responses?: ApiResponse[];
  company?: ApiCaseCompany | null;
  stepTimestamps?: Record<number, string>;
  linkUrl?: string | null;
}

export interface ApiCaseCompany {
  companyName: string;
  crisNumber: string;
  country: string | null;
  riskRating: string | null;
  incorporationDate?: string | null;
  legalStructure?: string | null;
  primaryIndustry?: string | null;
  recipientEmails: string[];
}

export interface ApiResponse {
  question: string;
  answer?: string | null;
  mandatory?: boolean;
}

export interface ApiCompany {
  companyId: string;
  companyName: string;
  crisNumber: string;
  country: string;
  riskRating: CompanyData["riskRating"];
  legalStructure?: string | null;
  primaryIndustry?: string | null;
  incorporationDate?: string | null;
  recipientEmails: string[];
}

export interface ApiAuditEvent {
  auditId: string;
  caseId?: string | null;
  caseSubject?: string | null;
  caseOrderId?: string | null;
  step?: number | null;
  eventType: AuditEvent["type"];
  description: string;
  triggeredBy?: string | null;
  triggeredByUserId?: string | null;
  status: AuditEvent["status"];
  payload?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ApiNotification {
  notificationId: string;
  userId: string;
  type: Notification["type"];
  title: string;
  body: string;
  read: boolean;
  caseId?: string | null;
  createdAt: string;
}

export interface ApiPlatformConfig {
  configId: string;
  linkValidityDays: number;
  tokenType: string;
  tokenExpiryValue: number;
  tokenExpiryUnit: "hours" | "minutes";
  otpLength: number;
  otpExpiryMinutes: number;
  otpMaxAttempts: number;
  reminder1Day: number;
  reminder2Day: number;
  reminderFinalDay: number;
  expiryDay: number;
  gamificationEnabled: boolean;
  tier1Label?: string | null;
  tier1Description?: string | null;
  tier2Label?: string | null;
  tier2Description?: string | null;
  autoProcessA: boolean;
  manualProcessB: boolean;
  alertCd: boolean;
  auditRetentionDays: number;
  exportFormat: string;
  staleHours: number;
  updatedAt: string;
}

export interface ApiTemplateSection {
  sectionId?: string;
  title: string;
  description?: string;
  banner?: string;
  orderIndex: number;
  questions: ApiTemplateQuestion[];
}

export interface ApiTemplateQuestion {
  questionId?: string;
  label: string;
  fieldType: Question["type"];
  mandatory: boolean;
  prefill?: boolean;
  systemControlled?: boolean;
  repeater?: boolean;
  attachUpload?: boolean;
  sameAsToggleLabel?: string;
  note?: string;
  helpText?: string;
  placeholder?: string;
  validation?: Question["validation"];
  condition?: Question["condition"];
  orderIndex: number;
  options?: string[];
  tableColumns?: Question["columns"];
}

export interface ApiTemplate {
  templateId: string;
  name: string;
  recipientType: Template["recipientType"];
  status: Template["status"];
  updatedAt: string;
  updatedBy?: string | null;
  editorName?: string | null;
  totalQuestions?: number;
  requiredCount?: number;
  optionalCount?: number;
  sections?: ApiTemplateSection[];
}

const EMPTY_COMPANY: CompanyData = {
  companyName: "",
  registrationNumber: "",
  country: "",
  riskRating: "Low",
  recipientEmails: [],
  additionalFields: {
    incorporationDate: "",
    legalStructure: "",
    primaryIndustry: "",
  },
};

export function toRoleKey(role: string): RoleKey {
  return role.toLowerCase() as RoleKey;
}

export function toApiRole(role: RoleKey): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function mapCurrentUser(u: ApiUser): CurrentUser {
  return {
    id: u.userId,
    name: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email,
    role: toRoleKey(u.role),
    title: u.title ?? u.role,
    initials: u.initials ?? `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase(),
  };
}

export function mapUser(u: ApiUser): User {
  const score =
    u.score == null ? null : typeof u.score === "string" ? parseFloat(u.score) : u.score;
  return {
    id: u.userId,
    name: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email,
    totalReports: u.totalReports ?? null,
    score: Number.isFinite(score) ? score : null,
    lastSubmission: u.lastSubmission ? absTime(u.lastSubmission) : null,
    status: (u.status === "Pending" ? "Pending" : u.status === "Active" ? "Active" : "Inactive") as User["status"],
    role: toRoleKey(u.role),
    platforms: u.platforms?.map((p) => p.platform),
  };
}

function pctToCompletion(pct: number): { done: number; total: number } {
  const value = Math.max(0, Math.min(100, pct ?? 0));
  return { done: value, total: 100 };
}

function mapResponses(responses?: ApiResponse[]): QuestionnaireResponse[] {
  return (responses ?? []).map((r) => ({
    question: r.question,
    answer: r.answer ?? "",
    mandatory: r.mandatory ?? false,
  }));
}

function mapCaseCompany(c: ApiCaseCompany): CompanyData {
  return {
    companyName: c.companyName,
    registrationNumber: c.crisNumber,
    country: c.country ?? "",
    riskRating: (c.riskRating ?? "Low") as CompanyData["riskRating"],
    recipientEmails: c.recipientEmails ?? [],
    additionalFields: {
      incorporationDate: c.incorporationDate ?? "",
      legalStructure: c.legalStructure ?? "",
      primaryIndustry: c.primaryIndustry ?? "",
    },
  };
}

export function mapCase(
  raw: ApiCase,
  company?: CompanyData | null,
  uid = "",
): CaseRecord {
  const companyData =
    company ??
    (raw.company ? mapCaseCompany(raw.company) : {
      ...EMPTY_COMPANY,
      companyName: raw.subjectName,
      country: raw.country,
    });

  return {
    id: raw.caseId,
    orderId: raw.orderId,
    uid: uid || raw.company?.crisNumber || companyData.registrationNumber,
    subjectName: raw.subjectName,
    country: raw.country,
    recipientType: raw.recipientType,
    status: raw.status,
    completionMandatory: pctToCompletion(raw.completionMandatory),
    completionOptional: pctToCompletion(raw.completionOptional),
    requestedDate: raw.dateReceived,
    lastActivity: raw.lastActivity ?? raw.dateReceived,
    researcherStatus: (raw.researcherStatus ?? "Not Applicable") as ResearcherStatus,
    researcherNotes: raw.researcherNotes ?? undefined,
    researcherDecision:
      raw.researcherStatus === "Approved" ||
      raw.researcherStatus === "Flagged" ||
      raw.researcherStatus === "Rejected"
        ? raw.researcherStatus
        : undefined,
    reviewDate: raw.researcherReviewedAt ?? undefined,
    apiPushStatus: raw.apiPushStatus ?? undefined,
    companyData,
    link: {
      sentAt: raw.dateDispatched ?? raw.dateReceived,
      expiresAt: raw.linkExpiry ?? undefined,
      resentCount: raw.resentCount ?? 0,
    },
    responses: mapResponses(raw.responses),
    currentStep: raw.currentStep,
    analyst: raw.analystName ?? "—",
    linkExpiry: raw.linkExpiry ?? null,
    linkValidityHours: raw.linkValidityHours ?? 48,
    remindersSent: raw.remindersSent ?? null,
    stepTimestamps: raw.stepTimestamps,
    linkUrl: raw.linkUrl,
  };
}

function normalizeRecipientEmails(emails: ApiCompany["recipientEmails"]): string[] {
  if (!Array.isArray(emails)) return [];
  return emails.map((entry) =>
    typeof entry === "string"
      ? entry
      : typeof entry === "object" && entry && "email" in entry
        ? String((entry as { email: string }).email)
        : String(entry)
  );
}

export function mapCompany(c: ApiCompany): CompanyData {
  return {
    companyName: c.companyName,
    registrationNumber: c.crisNumber,
    country: c.country,
    riskRating: c.riskRating,
    recipientEmails: normalizeRecipientEmails(c.recipientEmails),
    additionalFields: {
      incorporationDate: c.incorporationDate ?? "",
      legalStructure: c.legalStructure ?? "",
      primaryIndustry: c.primaryIndustry ?? "",
    },
  };
}

export function mapAuditEvent(e: ApiAuditEvent): AuditEvent {
  return {
    id: e.auditId,
    timestamp: e.createdAt,
    caseId: e.caseId ?? "",
    caseSubject: e.caseSubject ?? "",
    caseOrderId: e.caseOrderId ?? "",
    step: e.step ?? 0,
    type: e.eventType,
    description: e.description,
    triggeredBy: e.triggeredBy ?? "System",
    status: e.status,
    payload: e.payload ?? undefined,
  };
}

export function mapNotification(n: ApiNotification): Notification {
  const type = n.type === "stale" ? "stale" : n.type;
  return {
    id: n.notificationId,
    type,
    title: n.title,
    body: n.body,
    time: relTime(n.createdAt),
    read: n.read,
    caseId: n.caseId ?? undefined,
  };
}

export function mapPlatformConfig(c: ApiPlatformConfig): PlatformConfig {
  const tokenHours = c.tokenExpiryUnit === "hours" ? c.tokenExpiryValue : 0;
  const tokenMinutes = c.tokenExpiryUnit === "minutes" ? c.tokenExpiryValue : 0;
  return {
    linkValidity: c.linkValidityDays,
    tokenType: c.tokenType,
    tokenUnit: c.tokenExpiryUnit,
    tokenHours: tokenHours || 24,
    tokenMinutes: tokenMinutes || 60,
    otpExpiry: c.otpExpiryMinutes,
    otpRetry: c.otpMaxAttempts,
    lockoutDuration: 15,
    otpResend: 3,
    r1: c.reminder1Day,
    r2: c.reminder2Day,
    r3: c.reminderFinalDay,
    expiry: c.expiryDay,
    gamification: c.gamificationEnabled,
    midPrompt: true,
    midText: "You are halfway there — great progress!",
    nearPrompt: true,
    nearText: "You are 80% complete — only one section remaining.",
    rewardSystem: true,
    tier1Title: c.tier1Label ?? "Cedar Rose Insights Access",
    tier1Desc: c.tier1Description ?? "",
    tier1Accel: true,
    tier1Discount: true,
    tier1Active: true,
    tier2Title: c.tier2Label ?? "Cedar Rose Service Information",
    tier2Desc: c.tier2Description ?? "",
    tier2Active: true,
    autoA: c.autoProcessA,
    manualB: c.manualProcessB,
    alertCD: c.alertCd,
    auditRetention: c.auditRetentionDays,
    exportFormat: c.exportFormat,
    staleHours: c.staleHours,
  };
}

export function mapPlatformConfigToApi(config: PlatformConfig): Partial<ApiPlatformConfig> {
  const tokenExpiryUnit = config.tokenUnit;
  const tokenExpiryValue =
    tokenExpiryUnit === "hours" ? config.tokenHours : config.tokenMinutes;
  return {
    linkValidityDays: config.linkValidity,
    tokenType: config.tokenType,
    tokenExpiryValue,
    tokenExpiryUnit,
    otpExpiryMinutes: config.otpExpiry,
    otpMaxAttempts: config.otpRetry,
    reminder1Day: config.r1,
    reminder2Day: config.r2,
    reminderFinalDay: config.r3,
    expiryDay: config.expiry,
    gamificationEnabled: config.gamification,
    tier1Label: config.tier1Title,
    tier1Description: config.tier1Desc,
    tier2Label: config.tier2Title,
    tier2Description: config.tier2Desc,
    autoProcessA: config.autoA,
    manualProcessB: config.manualB,
    alertCd: config.alertCD,
    auditRetentionDays: config.auditRetention,
    exportFormat: config.exportFormat,
    staleHours: config.staleHours,
  };
}

function formatTemplateDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeFieldType(type: string): Question["type"] {
  if (type === "support_doc") return "file";
  return type as Question["type"];
}

function mapTableColumns(
  cols?: Array<{ name?: string; label?: string; key?: string; type?: string; required?: boolean }>
): Question["columns"] | undefined {
  if (!cols?.length) return undefined;
  return cols.map((c) => ({
    name: c.name ?? c.label ?? c.key ?? "Column",
    type: normalizeFieldType(c.type ?? "text"),
    required: c.required ?? false,
  }));
}

function mapQuestion(q: ApiTemplateQuestion, index: number): Question {
  return {
    id: q.questionId ?? `q-${index}`,
    text: q.label ?? "",
    type: normalizeFieldType(q.fieldType),
    required: q.mandatory,
    prefill: q.prefill ?? false,
    options: q.options ?? undefined,
    helpText: q.helpText ?? undefined,
    systemControlled: q.systemControlled ?? undefined,
    note: q.note ?? undefined,
    repeater: q.repeater ?? undefined,
    attachUpload: q.attachUpload ?? undefined,
    sameAsToggleLabel: q.sameAsToggleLabel ?? undefined,
    columns: mapTableColumns(q.tableColumns),
    validation: q.validation ?? undefined,
    condition: q.condition ?? undefined,
  };
}

function mapSection(s: ApiTemplateSection, index: number): Section {
  return {
    id: s.sectionId ?? `s-${index}`,
    number: index + 1,
    title: s.title,
    description: s.description ?? undefined,
    banner: s.banner ?? undefined,
    questions: s.questions
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((q, qi) => mapQuestion(q, qi)),
  };
}

function definedOnly<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  ) as Partial<T>;
}

export function mapTemplateToApi(template: Template): {
  name: string;
  recipientType: Template["recipientType"];
  sections: ApiTemplateSection[];
} {
  return {
    name: template.name,
    recipientType: template.recipientType,
    sections: template.sections.map((section, si) =>
      definedOnly({
        title: section.title,
        description: section.description,
        banner: section.banner,
        orderIndex: si,
        questions: section.questions.map((q, qi) =>
          definedOnly({
            label: q.text,
            fieldType: q.type,
            mandatory: q.required,
            prefill: q.prefill,
            systemControlled: q.systemControlled,
            repeater: q.repeater,
            attachUpload: q.attachUpload,
            sameAsToggleLabel: q.sameAsToggleLabel,
            note: q.note,
            helpText: q.helpText,
            validation: q.validation,
            condition: q.condition,
            orderIndex: qi,
            options: q.options,
            tableColumns: q.columns,
          })
        ),
      }) as ApiTemplateSection
    ),
  };
}

export function mapTemplate(t: ApiTemplate, editor?: string): Template {
  return {
    id: t.templateId,
    name: t.name,
    recipientType: t.recipientType,
    status: t.status,
    lastEdited: formatTemplateDate(t.updatedAt),
    editor: editor ?? t.editorName ?? "—",
    sections: (t.sections ?? [])
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((s, i) => mapSection(s, i)),
  };
}

export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "User", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function isLocalUserId(id: string): boolean {
  return id.startsWith("USR-") || !/^[0-9a-f-]{36}$/i.test(id);
}

export function isLocalTemplateId(id: string): boolean {
  return id.startsWith("tpl-") || !/^[0-9a-f-]{36}$/i.test(id);
}

export interface ApiQuestionnaireFormPayload {
  case: {
    caseId: string;
    subjectName: string;
    recipientType: string;
    status: string;
    currentStep?: number;
  };
  template: ApiTemplate;
  savedResponses?: Array<{
    questionId?: string | null;
    sectionId?: string | null;
    question: string;
    answer?: string | null;
    mandatory?: boolean;
  }>;
}

export function mapQuestionnaireFormData(raw: ApiQuestionnaireFormPayload): QuestionnaireFormData {
  const mappedTemplate = mapTemplate(raw.template);

  return {
    case: {
      caseId: raw.case.caseId,
      subjectName: raw.case.subjectName,
      recipientType: raw.case.recipientType,
      status: raw.case.status,
      currentStep: raw.case.currentStep ?? 1,
    },
    template: {
      id: mappedTemplate.id,
      name: mappedTemplate.name,
      sections: mappedTemplate.sections,
    },
    savedResponses: raw.savedResponses
      ?.filter((r): r is typeof r & { questionId: string; sectionId: string } =>
        Boolean(r.questionId && r.sectionId),
      )
      .map((r) => ({
        questionId: r.questionId,
        sectionId: r.sectionId,
        question: r.question,
        answer: r.answer ?? "",
        mandatory: r.mandatory ?? false,
      })),
  };
}
