import { getDb } from "./config/database.js";
import { EmailService } from "./lib/email-service.js";
import { AuditRepository } from "./modules/audit/audit.repository.js";
import { AuditService } from "./modules/audit/audit.service.js";
import { AuditController } from "./modules/audit/audit.controller.js";
import { AuthRepository } from "./modules/auth/auth.repository.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { AuthController } from "./modules/auth/auth.controller.js";
import { CasesRepository } from "./modules/cases/cases.repository.js";
import { CasesService } from "./modules/cases/cases.service.js";
import { CasesController } from "./modules/cases/cases.controller.js";
import { CompaniesRepository } from "./modules/companies/companies.repository.js";
import { CompaniesService } from "./modules/companies/companies.service.js";
import { CompaniesController } from "./modules/companies/companies.controller.js";
import { ConfigRepository } from "./modules/config/config.repository.js";
import { ConfigService } from "./modules/config/config.service.js";
import { ConfigController } from "./modules/config/config.controller.js";
import { NotificationsRepository } from "./modules/notifications/notifications.repository.js";
import { NotificationsService } from "./modules/notifications/notifications.service.js";
import { NotificationsController } from "./modules/notifications/notifications.controller.js";
import { QuestionnaireRepository } from "./modules/questionnaire/questionnaire.repository.js";
import { QuestionnaireService } from "./modules/questionnaire/questionnaire.service.js";
import { QuestionnaireController } from "./modules/questionnaire/questionnaire.controller.js";
import { TemplatesRepository } from "./modules/templates/templates.repository.js";
import { TemplatesService } from "./modules/templates/templates.service.js";
import { TemplatesController } from "./modules/templates/templates.controller.js";
import { UsersRepository } from "./modules/users/users.repository.js";
import { UsersService } from "./modules/users/users.service.js";
import { UsersController } from "./modules/users/users.controller.js";
import { DashboardRepository } from "./modules/dashboard/dashboard.repository.js";
import { DashboardService } from "./modules/dashboard/dashboard.service.js";
import { DashboardController } from "./modules/dashboard/dashboard.controller.js";

export function createContainer() {
  const db = getDb();
  const emailService = new EmailService();

  const auditRepo = new AuditRepository(db);
  const authRepo = new AuthRepository(db);
  const casesRepo = new CasesRepository(db);
  const companiesRepo = new CompaniesRepository(db);
  const configRepo = new ConfigRepository(db);
  const notificationsRepo = new NotificationsRepository(db);
  const questionnaireRepo = new QuestionnaireRepository(db);
  const templatesRepo = new TemplatesRepository(db);
  const usersRepo = new UsersRepository(db);
  const dashboardRepo = new DashboardRepository(db);

  const auditService = new AuditService(auditRepo, casesRepo, usersRepo);
  const notificationsService = new NotificationsService(notificationsRepo, casesRepo);
  const authService = new AuthService(authRepo, emailService);
  const templatesService = new TemplatesService(templatesRepo);
  const configService = new ConfigService(configRepo);
  const companiesService = new CompaniesService(companiesRepo);
  const usersService = new UsersService(db, usersRepo, emailService);
  const casesService = new CasesService(
    casesRepo,
    companiesRepo,
    templatesRepo,
    auditService,
    notificationsService,
    emailService,
  );
  const questionnaireService = new QuestionnaireService(
    casesRepo,
    templatesRepo,
    questionnaireRepo,
    auditService,
    notificationsService,
    emailService,
  );
  const dashboardService = new DashboardService(dashboardRepo);

  return {
    db,
    emailService,
    auditService,
    authService,
    casesService,
    companiesService,
    configService,
    notificationsService,
    questionnaireService,
    templatesService,
    usersService,
    casesRepo,
    controllers: {
      audit: new AuditController(auditService),
      auth: new AuthController(authService),
      cases: new CasesController(casesService),
      companies: new CompaniesController(companiesService),
      config: new ConfigController(configService),
      notifications: new NotificationsController(notificationsService),
      questionnaire: new QuestionnaireController(questionnaireService),
      templates: new TemplatesController(templatesService),
      users: new UsersController(usersService),
      dashboard: new DashboardController(dashboardService),
    },
    repos: {
      auditRepo,
      casesRepo,
      configRepo,
      notificationsRepo,
    },
  };
}

export type Container = ReturnType<typeof createContainer>;
