import { env } from "@/config/env";
import { mockCasesService } from "./mock/cases.mock";
import { mockAuditService } from "./mock/audit.mock";
import { mockCompaniesService } from "./mock/companies.mock";
import { mockUsersService } from "./mock/users.mock";
import { mockTemplatesService } from "./mock/templates.mock";
import { mockConfigService } from "./mock/config.mock";
import { mockNotificationsService } from "./mock/notifications.mock";
import { mockAuthService } from "./mock/auth.mock";
import { mockDashboardService } from "./mock/dashboard.mock";
import { mockQuestionnaireService } from "./mock/questionnaire.mock";
import {
  apiCasesService,
  apiAuditService,
  apiCompaniesService,
  apiUsersService,
  apiTemplatesService,
  apiConfigService,
  apiNotificationsService,
  apiAuthService,
  apiDashboardService,
} from "./api/client";
import { apiQuestionnaireService } from "./api/questionnaire";

export const casesService = env.useMock ? mockCasesService : apiCasesService;
export const auditService = env.useMock ? mockAuditService : apiAuditService;
export const companiesService = env.useMock ? mockCompaniesService : apiCompaniesService;
export const usersService = env.useMock ? mockUsersService : apiUsersService;
export const templatesService = env.useMock ? mockTemplatesService : apiTemplatesService;
export const configService = env.useMock ? mockConfigService : apiConfigService;
export const notificationsService = env.useMock ? mockNotificationsService : apiNotificationsService;
export const authService = env.useMock ? mockAuthService : apiAuthService;
export const dashboardService = env.useMock ? mockDashboardService : apiDashboardService;
export const questionnaireService = env.useMock ? mockQuestionnaireService : apiQuestionnaireService;

export type { CasesService } from "./mock/cases.mock";
export type { AuditService } from "./mock/audit.mock";
export type { CompaniesService } from "./mock/companies.mock";
export type { UsersService } from "./mock/users.mock";
export type { TemplatesService } from "./mock/templates.mock";
export type { ConfigService } from "./mock/config.mock";
export type { NotificationsService } from "./mock/notifications.mock";
export type { AuthService } from "./mock/auth.mock";
export type { DashboardService } from "./mock/dashboard.mock";
export type { QuestionnaireService } from "./mock/questionnaire.mock";
