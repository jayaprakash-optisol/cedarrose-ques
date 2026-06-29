import type { OpenAPIV3 } from "../types.js";

export const responses: Record<string, OpenAPIV3.ResponseObject> = {
  Unauthorized: {
    description: "Missing or invalid authentication token",
    content: {
      "application/json": { schema: { $ref: "#/components/schemas/ErrorBody" } },
    },
  },
  Forbidden: {
    description: "Insufficient permissions",
    content: {
      "application/json": { schema: { $ref: "#/components/schemas/ErrorBody" } },
    },
  },
  NotFound: {
    description: "Resource not found",
    content: {
      "application/json": { schema: { $ref: "#/components/schemas/ErrorBody" } },
    },
  },
  ValidationError: {
    description: "Request validation failed",
    content: {
      "application/json": { schema: { $ref: "#/components/schemas/ErrorBody" } },
    },
  },
  InternalError: {
    description: "Unexpected server error",
    content: {
      "application/json": { schema: { $ref: "#/components/schemas/ErrorBody" } },
    },
  },
};

export const parameters = {
  page: {
    name: "page",
    in: "query" as const,
    schema: { type: "integer", minimum: 1, default: 1 },
    description: "Page number (1-based)",
  },
  limit: {
    name: "limit",
    in: "query" as const,
    schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    description: "Items per page",
  },
  id: {
    name: "id",
    in: "path" as const,
    required: true,
    schema: { $ref: "#/components/schemas/Uuid" },
  },
  uid: {
    name: "uid",
    in: "path" as const,
    required: true,
    schema: { type: "string" },
    description: "CRiS company UID",
  },
};

export function jsonRequest(schemaRef: string): OpenAPIV3.RequestBodyObject {
  return {
    required: true,
    content: { "application/json": { schema: { $ref: schemaRef } } },
  };
}

export function jsonSuccess(schemaRef: string, description = "Success"): OpenAPIV3.ResponseObject {
  return {
    description,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean", description: "Always true on success" },
            data: { $ref: schemaRef },
            message: { type: "string" },
            meta: { $ref: "#/components/schemas/PaginationMeta" },
          },
        },
      },
    },
  };
}

export function jsonSuccessArray(
  itemRef: string,
  description = "Success"
): OpenAPIV3.ResponseObject {
  return {
    description,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean", description: "Always true on success" },
            data: { type: "array", items: { $ref: itemRef } },
            meta: { $ref: "#/components/schemas/PaginationMeta" },
          },
        },
      },
    },
  };
}

export const stdErrors: OpenAPIV3.ResponsesObject = {
  "401": { $ref: "#/components/responses/Unauthorized" },
  "403": { $ref: "#/components/responses/Forbidden" },
  "404": { $ref: "#/components/responses/NotFound" },
  "422": { $ref: "#/components/responses/ValidationError" },
  "500": { $ref: "#/components/responses/InternalError" },
};
