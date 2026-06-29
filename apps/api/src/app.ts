import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { requestId } from "./middleware/request-id.js";
import { httpLogger } from "./middleware/http-logger.js";
import { cookieTokenExtractor } from "./middleware/rate-limit.js";
import { authenticate } from "./middleware/authenticate.js";
import { authorize } from "./middleware/authorize.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createContainer } from "./container.js";
import { setupSwagger } from "./swagger/setup.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { casesRouter } from "./modules/cases/cases.router.js";
import { companiesRouter } from "./modules/companies/companies.router.js";
import { auditRouter } from "./modules/audit/audit.router.js";
import { notificationsRouter } from "./modules/notifications/notifications.router.js";
import { questionnaireRouter } from "./modules/questionnaire/questionnaire.router.js";
import { templatesRouter } from "./modules/templates/templates.router.js";
import { configRouter } from "./modules/config/config.router.js";
import { usersRouter } from "./modules/users/users.router.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.router.js";
import { getDb } from "./config/database.js";
import { countries } from "./db/schema/countries.js";
import { failure, sendSuccess } from "./shared/utils/response.js";

export function createApp() {
  const app = express();
  const container = createContainer();

  app.disable("x-powered-by");
  if (env.isProduction && env.trustProxyHops > 0) {
    app.set("trust proxy", env.trustProxyHops);
  }
  app.use(requestId());
  app.use(httpLogger);
  app.use(
    helmet({
      contentSecurityPolicy: env.nodeEnv === "production",
      hsts: env.nodeEnv === "production" ? { maxAge: 31536000, includeSubDomains: true } : false,
    }),
  );
  app.use(
    cors({
      origin: env.allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );
  app.use(express.json({ limit: "500kb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(cookieTokenExtractor);
  app.use(compression());

  if (!env.isProduction) {
    setupSwagger(app);
  }

  app.get("/health", async (_req, res) => {
    try {
      const db = getDb();
      await db.select().from(countries).limit(1);
      sendSuccess(res, { status: "ok", timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ success: false, error: { message: "Database unavailable" } });
    }
  });

  const { controllers } = container;

  app.use("/api/v1/auth", authRouter(controllers.auth));
  app.use("/api/v1/cases", authenticate, casesRouter(controllers.cases));
  app.use("/api/v1/dashboard", authenticate, dashboardRouter(controllers.dashboard));
  app.use("/api/v1/companies", authenticate, companiesRouter(controllers.companies));
  app.use("/api/v1/audit-log", authenticate, auditRouter(controllers.audit));
  app.use("/api/v1/notifications", authenticate, notificationsRouter(controllers.notifications));
  app.use("/api/v1/questionnaire", questionnaireRouter(controllers.questionnaire));

  const adminRouter = express.Router();
  adminRouter.use(authorize("Admin"));
  adminRouter.use("/users", usersRouter(controllers.users));
  adminRouter.use("/templates", templatesRouter(controllers.templates));
  adminRouter.use("/config", configRouter(controllers.config));
  app.use("/api/v1/admin", authenticate, adminRouter);

  app.get("/api/v1/countries", authenticate, async (_req, res) => {
    const db = getDb();
    const data = await db.select().from(countries);
    sendSuccess(res, data);
  });

  app.use((_req, res) => {
    const requestId = String(_req.id ?? "");
    res.status(404).json(failure("NOT_FOUND", "Route not found", requestId));
  });

  app.use(errorHandler);

  return { app, container };
}
