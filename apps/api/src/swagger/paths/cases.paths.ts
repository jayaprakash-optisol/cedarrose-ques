import type { OpenAPIV3 } from "../types.js";
import { jsonRequest, jsonSuccess, jsonSuccessArray, parameters, stdErrors } from "../components/helpers.js";

const bearer = [{ bearerAuth: [] }];

export const casesPaths: OpenAPIV3.PathsObject = {
  "/api/v1/cases": {
    get: {
      tags: ["Cases"],
      summary: "List cases",
      operationId: "casesList",
      security: bearer,
      parameters: [
        parameters.page,
        parameters.limit,
        { name: "status", in: "query", schema: { $ref: "#/components/schemas/CaseStatus" } },
        { name: "recipientType", in: "query", schema: { $ref: "#/components/schemas/RecipientType" } },
        { name: "country", in: "query", schema: { type: "string" } },
        { name: "analystId", in: "query", schema: { $ref: "#/components/schemas/Uuid" } },
        { name: "search", in: "query", schema: { type: "string" }, description: "Search subject or order ID" },
      ],
      responses: {
        "200": jsonSuccessArray("#/components/schemas/Case"),
        ...stdErrors,
      },
    },
    post: {
      tags: ["Cases"],
      summary: "Create questionnaire request",
      operationId: "casesCreate",
      security: bearer,
      requestBody: jsonRequest("#/components/schemas/CreateCaseRequest"),
      responses: {
        "201": jsonSuccess("#/components/schemas/Case", "Case created"),
        ...stdErrors,
      },
    },
  },
  "/api/v1/cases/export": {
    get: {
      tags: ["Cases"],
      summary: "Export cases as CSV",
      operationId: "casesExport",
      security: bearer,
      description: "Requires Admin or Analyst role.",
      responses: {
        "200": { description: "CSV file", content: { "text/csv": { schema: { type: "string" } } } },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/api/v1/cases/{id}": {
    get: {
      tags: ["Cases"],
      summary: "Get case with responses",
      operationId: "casesGetById",
      security: bearer,
      parameters: [parameters.id],
      responses: {
        "200": jsonSuccess("#/components/schemas/Case"),
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/v1/cases/{id}/resend-link": {
    patch: {
      tags: ["Cases"],
      summary: "Resend secure questionnaire link",
      operationId: "casesResendLink",
      security: bearer,
      parameters: [parameters.id],
      responses: {
        "200": jsonSuccess("#/components/schemas/Case", "Link resent"),
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/v1/cases/{id}/researcher-review": {
    patch: {
      tags: ["Cases"],
      summary: "Submit researcher review decision",
      operationId: "casesResearcherReview",
      security: bearer,
      description: "Requires Researcher or Admin role.",
      parameters: [parameters.id],
      requestBody: jsonRequest("#/components/schemas/ResearcherReviewRequest"),
      responses: {
        "200": jsonSuccess("#/components/schemas/Case", "Review submitted"),
        "400": { $ref: "#/components/responses/ValidationError" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/api/v1/cases/{id}/api-push": {
    patch: {
      tags: ["Cases"],
      summary: "Trigger API push to CedarRose",
      operationId: "casesApiPush",
      security: bearer,
      description: "Requires Admin role.",
      parameters: [parameters.id],
      responses: {
        "200": jsonSuccess("#/components/schemas/Case", "API push triggered"),
        "403": { $ref: "#/components/responses/Forbidden" },
        "500": { $ref: "#/components/responses/InternalError" },
      },
    },
  },
};
