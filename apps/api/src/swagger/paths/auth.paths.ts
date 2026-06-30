import type { OpenAPIV3 } from "../types.js";
import { jsonRequest, jsonSuccess, stdErrors } from "../components/helpers.js";

const bearer = [{ bearerAuth: [] }];

export const authPaths: OpenAPIV3.PathsObject = {
  "/api/v1/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Login",
      description: "Authenticate with email and password. Sets `access_token` cookie; optional `refresh_token` when `rememberMe` is true.",
      operationId: "authLogin",
      requestBody: jsonRequest("#/components/schemas/LoginRequest"),
      responses: {
        "200": { description: "Login successful", content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } } },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        ...stdErrors,
      },
    },
  },
  "/api/v1/auth/refresh": {
    post: {
      tags: ["Auth"],
      summary: "Refresh access token",
      operationId: "authRefresh",
      description: "Uses `refresh_token` cookie or body `refreshToken`. Issues new access + refresh tokens.",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { refreshToken: { type: "string" } },
            },
          },
        },
      },
      responses: {
        "200": { description: "Token refreshed", content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } } },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/v1/auth/logout": {
    post: {
      tags: ["Auth"],
      summary: "Logout",
      operationId: "authLogout",
      description: "Revokes refresh token and clears auth cookies.",
      responses: {
        "200": jsonSuccess("#/components/schemas/HealthResponse", "Logout successful"),
      },
    },
  },
  "/api/v1/auth/me": {
    get: {
      tags: ["Auth"],
      summary: "Current user profile",
      operationId: "authMe",
      security: bearer,
      responses: {
        "200": jsonSuccess("#/components/schemas/User"),
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/v1/auth/change-password": {
    post: {
      tags: ["Auth"],
      summary: "Change password",
      operationId: "authChangePassword",
      security: bearer,
      requestBody: jsonRequest("#/components/schemas/ChangePasswordRequest"),
      responses: {
        "200": jsonSuccess("#/components/schemas/HealthResponse", "Password changed"),
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/v1/auth/forgot-password": {
    post: {
      tags: ["Auth"],
      summary: "Request password reset",
      operationId: "authForgotPassword",
      requestBody: jsonRequest("#/components/schemas/ForgotPasswordRequest"),
      responses: {
        "200": jsonSuccess("#/components/schemas/HealthResponse", "Reset email sent if account exists"),
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/v1/auth/reset-password": {
    post: {
      tags: ["Auth"],
      summary: "Reset password with token",
      operationId: "authResetPassword",
      requestBody: jsonRequest("#/components/schemas/ResetPasswordRequest"),
      responses: {
        "200": jsonSuccess("#/components/schemas/HealthResponse", "Password reset"),
        "400": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/api/v1/auth/verify-invitation": {
    get: {
      tags: ["Auth"],
      summary: "Verify invitation token",
      operationId: "authVerifyInvitation",
      parameters: [
        { name: "token", in: "query", required: true, schema: { type: "string" } },
      ],
      responses: {
        "200": jsonSuccess("#/components/schemas/User"),
        "400": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/api/v1/auth/verify-reset-token": {
    get: {
      tags: ["Auth"],
      summary: "Verify password reset token",
      operationId: "authVerifyResetToken",
      parameters: [
        { name: "token", in: "query", required: true, schema: { type: "string" } },
      ],
      responses: {
        "200": jsonSuccess("#/components/schemas/HealthResponse", "Token valid"),
        "400": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/api/v1/auth/complete-registration": {
    post: {
      tags: ["Auth"],
      summary: "Complete registration (invited user)",
      operationId: "authCompleteRegistration",
      requestBody: jsonRequest("#/components/schemas/CompleteRegistrationRequest"),
      responses: {
        "200": jsonSuccess("#/components/schemas/HealthResponse", "Registration complete"),
        "400": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
};
