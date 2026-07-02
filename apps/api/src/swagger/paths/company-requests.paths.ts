import type { OpenAPIV3 } from "../types.js";
import { jsonRequest, jsonSuccess, jsonSuccessArray, parameters, stdErrors } from "../components/helpers.js";

const bearer = [{ bearerAuth: [] }];

export const companyRequestsPaths: OpenAPIV3.PathsObject = {
  "/api/v1/company-requests": {
    get: {
      tags: ["Company Requests"],
      summary: "List company requests",
      operationId: "companyRequestsList",
      security: bearer,
      parameters: [
        { name: "status", in: "query", schema: { type: "string", enum: ["Pending", "Used"] } },
      ],
      responses: {
        "200": jsonSuccessArray("#/components/schemas/CompanyRequest"),
        ...stdErrors,
      },
    },
  },
  "/api/v1/company-requests/{id}": {
    get: {
      tags: ["Company Requests"],
      summary: "Get company request by ID",
      operationId: "companyRequestsGetById",
      security: bearer,
      parameters: [parameters.id],
      responses: {
        "200": jsonSuccess("#/components/schemas/CompanyRequest"),
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
};

export const webhookCompanyRequestsPaths: OpenAPIV3.PathsObject = {
  "/api/v1/webhooks/company-requests": {
    post: {
      tags: ["Webhooks"],
      summary: "Ingest company request",
      description:
        "Receive company/request data from an external integration client. Requires an Integration-role bearer token.",
      operationId: "webhookCompanyRequestsIngest",
      security: bearer,
      requestBody: jsonRequest("#/components/schemas/WebhookCompanyRequest"),
      responses: {
        "201": jsonSuccess("#/components/schemas/CompanyRequest", "Company request received"),
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "422": { $ref: "#/components/responses/ValidationError" },
        "500": { $ref: "#/components/responses/InternalError" },
      },
    },
  },
};
