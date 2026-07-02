import type { OpenAPIV3 } from "./types.js";
import { schemas } from "./components/schemas.js";
import { responses } from "./components/helpers.js";
import { securitySchemes } from "./components/security.js";
import { authPaths } from "./paths/auth.paths.js";
import { casesPaths } from "./paths/cases.paths.js";
import { companyRequestsPaths, webhookCompanyRequestsPaths } from "./paths/company-requests.paths.js";
import {
  auditPaths,
  notificationsPaths,
} from "./paths/companies-audit-notifications.paths.js";
import {
  adminUsersPaths,
  adminTemplatesPaths,
  adminConfigPaths,
  questionnairePaths,
  miscPaths,
} from "./paths/admin-questionnaire-misc.paths.js";

function mergePaths(...groups: OpenAPIV3.PathsObject[]): OpenAPIV3.PathsObject {
  return Object.assign({}, ...groups);
}

export function buildOpenApiDocument(serverUrl = "http://localhost:3000"): OpenAPIV3.Document {
  return {
    openapi: "3.0.3",
    info: {
      title: "CedarRose OpsHub API",
      version: "1.0.0",
      description: [
        "REST API for CedarRose OpsHub — questionnaire case management, admin configuration, and recipient flows.",
        "",
        "**Authentication**",
        "- Staff routes: `Authorization: Bearer <access_token>` or `access_token` httpOnly cookie from login.",
        "- Questionnaire routes: Bearer token from `POST /api/v1/questionnaire/otp-verify`.",
        "- Webhook routes: `Authorization: Bearer <access_token>` authenticated as an Integration-role user.",
        "",
        "All successful JSON responses use `{ success: true, data, message?, meta? }`.",
      ].join("\n"),
      contact: { name: "CedarRose OpsHub" },
    },
    servers: [{ url: serverUrl, description: "API server" }],
    tags: [
      { name: "Auth", description: "Authentication and account lifecycle" },
      { name: "Cases", description: "Questionnaire case management" },
      { name: "Company Requests", description: "Webhook-received company request data" },
      { name: "Webhooks", description: "Client integration endpoints (Integration-role required)" },
      { name: "Audit Log", description: "Immutable audit trail" },
      { name: "Notifications", description: "User notifications" },
      { name: "Questionnaire (Public)", description: "Recipient-facing questionnaire flow" },
      { name: "Admin — Users", description: "User invitation and management (Admin)" },
      { name: "Admin — Templates", description: "Form builder templates (Admin)" },
      { name: "Admin — Config", description: "Platform configuration (Admin)" },
      { name: "Misc", description: "Health and reference data" },
    ],
    paths: mergePaths(
      authPaths,
      casesPaths,
      companyRequestsPaths,
      webhookCompanyRequestsPaths,
      auditPaths,
      notificationsPaths,
      adminUsersPaths,
      adminTemplatesPaths,
      adminConfigPaths,
      questionnairePaths,
      miscPaths
    ),
    components: {
      schemas,
      securitySchemes,
      responses,
    },
  };
}
