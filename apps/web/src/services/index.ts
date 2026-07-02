export {
  apiAuthService as authService,
  apiSettingsService as settingsService,
  apiCasesService as casesService,
  apiAuditService as auditService,
  apiCompanyRequestsService as companyRequestsService,
  apiUsersService as usersService,
  apiTemplatesService as templatesService,
  apiConfigService as configService,
  apiNotificationsService as notificationsService,
  apiDashboardService as dashboardService,
  ApiError,
} from "./api/client";
export { apiQuestionnaireService as questionnaireService } from "./api/questionnaire";

export type {
  AuthService,
  SettingsService,
  SaveSettingsInput,
  CasesService,
  CreateCaseInput,
  AuditService,
  CompanyRequestsService,
  CompanyRequestSummary,
  UsersService,
  TemplatesService,
  ConfigService,
  NotificationsService,
  DashboardService,
  QuestionnaireService,
} from "./types";
