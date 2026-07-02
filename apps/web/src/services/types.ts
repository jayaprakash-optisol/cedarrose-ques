import type {
  AuditEvent,
  AuditListParams,
  CaseRecord,
  CaseListParams,
  CompanyData,
  CurrentUser,
  InvitationInfo,
  Notification,
  PlatformConfig,
  Template,
  User,
} from "@/types";
import type { NotificationPreferences } from "@/types/user";
import type { PaginatedResult } from "@/types/pagination";
import type { DashboardPeriod, CompletionStats } from "@/types/dashboard";
import type {
  FormResponse,
  LinkVerifyResult,
  QuestionnaireFormData,
  QuestionnaireSession,
} from "@/types/questionnaire";
import type { RecipientType } from "@/types/case";

export interface SaveSettingsInput {
  name?: string;
  preferences?: Partial<NotificationPreferences>;
}

export interface SettingsService {
  get(): Promise<{ user: CurrentUser; preferences: NotificationPreferences }>;
  save(input: SaveSettingsInput): Promise<{ user: CurrentUser; preferences: NotificationPreferences }>;
  changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void>;
}

export interface AuthService {
  getCurrentUser(): Promise<CurrentUser>;
  login(email: string, password: string, rememberMe?: boolean): Promise<CurrentUser>;
  logout(): Promise<void>;
  verifyInvitation(token: string): Promise<InvitationInfo>;
  completeRegistration(token: string, password: string): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  verifyResetToken(token: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
}

export interface CreateCaseInput {
  orderId: string;
  companyRequestId?: string;
  subjectName: string;
  country: string;
  recipientType: RecipientType;
  recipientEmail?: string;
  linkValidityHours?: number;
  templateId?: string;
  analystId?: string;
}

export interface CasesService {
  list(params?: CaseListParams): Promise<PaginatedResult<CaseRecord>>;
  exportCsv(params?: Omit<CaseListParams, "page" | "limit">): Promise<void>;
  getById(id: string): Promise<CaseRecord | undefined>;
  resendLink(id: string): Promise<{ linkExpiry: string | null }>;
  create(input: CreateCaseInput): Promise<CaseRecord>;
}

export interface AuditService {
  list(params?: AuditListParams): Promise<PaginatedResult<AuditEvent>>;
  exportCsv(params?: Omit<AuditListParams, "page" | "limit" | "grouped">): Promise<void>;
}

export interface CompanyRequestsService {
  listPending(): Promise<CompanyRequestSummary[]>;
  getById(id: string): Promise<CompanyData>;
}

export interface CompanyRequestSummary {
  companyRequestId: string;
  orderId: string;
  externalRef: string;
  companyName: string;
  country: string;
  riskRating?: string | null;
  recipientType?: string | null;
  receivedAt: string;
  status: string;
}

export interface UsersService {
  list(): Promise<User[]>;
  save(users: User[]): Promise<User[]>;
}

export interface TemplatesService {
  list(): Promise<Template[]>;
  getById(id: string): Promise<Template>;
  create(input: { name: string; recipientType: Template["recipientType"] }): Promise<Template>;
  save(template: Template): Promise<Template>;
  updateStatus(id: string, status: Template["status"]): Promise<Template>;
  delete(id: string): Promise<void>;
}

export interface ConfigService {
  get(): Promise<PlatformConfig>;
  save(config: PlatformConfig): Promise<PlatformConfig>;
}

export interface NotificationsService {
  list(): Promise<Notification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
  save(notifications: Notification[]): Promise<Notification[]>;
}

export interface DashboardService {
  getCompletionStats(period: DashboardPeriod): Promise<CompletionStats>;
}

export interface QuestionnaireService {
  verifyLink(token: string): Promise<LinkVerifyResult>;
  requestOtp(token: string): Promise<void>;
  verifyOtp(token: string, otp: string): Promise<QuestionnaireSession>;
  getForm(token: string, sessionToken: string): Promise<QuestionnaireFormData>;
  saveProgress(token: string, sessionToken: string, responses: FormResponse[]): Promise<void>;
  submit(token: string, sessionToken: string): Promise<void>;
}
