import type { OpenAPIV3 } from "../types.js";

export const securitySchemes: Record<string, OpenAPIV3.SecuritySchemeObject> = {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Access token from login (Bearer header or `access_token` cookie)",
  },
  questionnaireAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Short-lived questionnaire session JWT from OTP verification",
  },
};
