import type { OpenAPIV3 } from "../types.js";
import { jsonRequest, jsonSuccess, jsonSuccessArray, parameters } from "../components/helpers.js";

const bearer = [{ bearerAuth: [] }];
const questionnaireBearer = [{ questionnaireAuth: [] }];

export const adminUsersPaths: OpenAPIV3.PathsObject = {
  "/api/v1/admin/users": {
    get: {
      tags: ["Admin — Users"],
      summary: "List users",
      operationId: "adminUsersList",
      security: bearer,
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        { name: "role", in: "query", schema: { $ref: "#/components/schemas/UserRole" } },
      ],
      responses: {
        "200": jsonSuccessArray("#/components/schemas/User"),
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/api/v1/admin/users/invite": {
    post: {
      tags: ["Admin — Users"],
      summary: "Invite new user",
      operationId: "adminUsersInvite",
      security: bearer,
      requestBody: jsonRequest("#/components/schemas/InviteUserRequest"),
      responses: {
        "201": jsonSuccess("#/components/schemas/User", "Invitation sent"),
        "409": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/api/v1/admin/users/export": {
    get: {
      tags: ["Admin — Users"],
      summary: "Export users CSV",
      operationId: "adminUsersExport",
      security: bearer,
      responses: {
        "200": { description: "CSV file", content: { "text/csv": { schema: { type: "string" } } } },
      },
    },
  },
  "/api/v1/admin/users/{id}": {
    patch: {
      tags: ["Admin — Users"],
      summary: "Update user",
      operationId: "adminUsersUpdate",
      security: bearer,
      parameters: [parameters.id],
      requestBody: jsonRequest("#/components/schemas/UpdateUserRequest"),
      responses: {
        "200": jsonSuccess("#/components/schemas/User", "User updated"),
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
    delete: {
      tags: ["Admin — Users"],
      summary: "Deactivate user (soft delete)",
      operationId: "adminUsersDeactivate",
      security: bearer,
      parameters: [parameters.id],
      responses: {
        "200": jsonSuccess("#/components/schemas/HealthResponse", "User deactivated"),
      },
    },
  },
  "/api/v1/admin/users/{id}/resend-invitation": {
    post: {
      tags: ["Admin — Users"],
      summary: "Resend invitation email",
      operationId: "adminUsersResendInvitation",
      security: bearer,
      parameters: [parameters.id],
      responses: {
        "200": jsonSuccess("#/components/schemas/HealthResponse", "Invitation resent"),
        "429": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/api/v1/admin/users/{id}/invitations": {
    delete: {
      tags: ["Admin — Users"],
      summary: "Cancel pending invitation",
      operationId: "adminUsersCancelInvitation",
      security: bearer,
      parameters: [parameters.id],
      responses: {
        "200": jsonSuccess("#/components/schemas/HealthResponse", "Invitation cancelled"),
      },
    },
  },
};

export const adminTemplatesPaths: OpenAPIV3.PathsObject = {
  "/api/v1/admin/templates": {
    get: {
      tags: ["Admin — Templates"],
      summary: "List templates",
      operationId: "adminTemplatesList",
      security: bearer,
      responses: {
        "200": jsonSuccessArray("#/components/schemas/Template"),
      },
    },
    post: {
      tags: ["Admin — Templates"],
      summary: "Create template",
      operationId: "adminTemplatesCreate",
      security: bearer,
      requestBody: jsonRequest("#/components/schemas/CreateTemplateRequest"),
      responses: {
        "201": jsonSuccess("#/components/schemas/Template", "Template created"),
      },
    },
  },
  "/api/v1/admin/templates/{id}": {
    get: {
      tags: ["Admin — Templates"],
      summary: "Get template with sections and questions",
      operationId: "adminTemplatesGetById",
      security: bearer,
      parameters: [parameters.id],
      responses: {
        "200": jsonSuccess("#/components/schemas/Template"),
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
    put: {
      tags: ["Admin — Templates"],
      summary: "Replace full template",
      operationId: "adminTemplatesReplace",
      security: bearer,
      parameters: [parameters.id],
      requestBody: jsonRequest("#/components/schemas/CreateTemplateRequest"),
      responses: {
        "200": jsonSuccess("#/components/schemas/Template", "Template updated"),
      },
    },
    delete: {
      tags: ["Admin — Templates"],
      summary: "Delete draft template",
      operationId: "adminTemplatesDelete",
      security: bearer,
      parameters: [parameters.id],
      responses: {
        "200": jsonSuccess("#/components/schemas/HealthResponse", "Template deleted"),
        "400": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/api/v1/admin/templates/{id}/status": {
    patch: {
      tags: ["Admin — Templates"],
      summary: "Activate or draft template",
      operationId: "adminTemplatesUpdateStatus",
      security: bearer,
      parameters: [parameters.id],
      requestBody: jsonRequest("#/components/schemas/UpdateTemplateStatusRequest"),
      responses: {
        "200": jsonSuccess("#/components/schemas/Template", "Status updated"),
      },
    },
  },
};

export const adminConfigPaths: OpenAPIV3.PathsObject = {
  "/api/v1/admin/config": {
    get: {
      tags: ["Admin — Config"],
      summary: "Get platform configuration",
      operationId: "adminConfigGet",
      security: bearer,
      responses: {
        "200": jsonSuccess("#/components/schemas/PlatformConfig"),
      },
    },
    put: {
      tags: ["Admin — Config"],
      summary: "Replace platform configuration",
      operationId: "adminConfigReplace",
      security: bearer,
      requestBody: jsonRequest("#/components/schemas/PlatformConfig"),
      responses: {
        "200": jsonSuccess("#/components/schemas/PlatformConfig", "Config updated"),
      },
    },
  },
};

export const questionnairePaths: OpenAPIV3.PathsObject = {
  "/api/v1/questionnaire/verify-link": {
    post: {
      tags: ["Questionnaire (Public)"],
      summary: "Validate secure link token",
      operationId: "questionnaireVerifyLink",
      requestBody: jsonRequest("#/components/schemas/VerifyLinkRequest"),
      responses: {
        "200": jsonSuccess("#/components/schemas/Case", "Link valid"),
        "400": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/api/v1/questionnaire/authenticate": {
    post: {
      tags: ["Questionnaire (Public)"],
      summary: "Request OTP",
      operationId: "questionnaireAuthenticate",
      requestBody: jsonRequest("#/components/schemas/QuestionnaireAuthenticateRequest"),
      responses: {
        "200": jsonSuccess("#/components/schemas/HealthResponse", "OTP sent"),
        "429": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/api/v1/questionnaire/otp-verify": {
    post: {
      tags: ["Questionnaire (Public)"],
      summary: "Verify OTP and get session JWT",
      operationId: "questionnaireOtpVerify",
      requestBody: jsonRequest("#/components/schemas/OtpVerifyRequest"),
      responses: {
        "200": {
          description: "Session token issued",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: {
                    type: "object",
                    properties: {
                      sessionToken: { type: "string" },
                      caseId: { $ref: "#/components/schemas/Uuid" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/questionnaire/{token}/form": {
    get: {
      tags: ["Questionnaire (Public)"],
      summary: "Get questionnaire form",
      operationId: "questionnaireGetForm",
      security: questionnaireBearer,
      parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": jsonSuccess("#/components/schemas/Template", "Form loaded"),
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/v1/questionnaire/{token}/save": {
    post: {
      tags: ["Questionnaire (Public)"],
      summary: "Auto-save progress",
      operationId: "questionnaireSave",
      security: questionnaireBearer,
      parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
      requestBody: jsonRequest("#/components/schemas/SaveProgressRequest"),
      responses: {
        "200": jsonSuccess("#/components/schemas/HealthResponse", "Progress saved"),
      },
    },
  },
  "/api/v1/questionnaire/{token}/submit": {
    post: {
      tags: ["Questionnaire (Public)"],
      summary: "Submit questionnaire",
      operationId: "questionnaireSubmit",
      security: questionnaireBearer,
      parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": jsonSuccess("#/components/schemas/Case", "Submitted"),
      },
    },
  },
};

export const miscPaths: OpenAPIV3.PathsObject = {
  "/health": {
    get: {
      tags: ["Misc"],
      summary: "Health check",
      operationId: "healthCheck",
      responses: {
        "200": { description: "Service healthy", content: { "application/json": { schema: { $ref: "#/components/schemas/HealthResponse" } } } },
        "503": { description: "Database unavailable" },
      },
    },
  },
  "/api/v1/countries": {
    get: {
      tags: ["Misc"],
      summary: "List countries",
      operationId: "countriesList",
      security: bearer,
      responses: {
        "200": jsonSuccessArray("#/components/schemas/Country"),
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
};
