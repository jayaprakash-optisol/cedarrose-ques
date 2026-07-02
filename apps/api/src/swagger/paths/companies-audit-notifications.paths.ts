import type { OpenAPIV3 } from "../types.js";
import { jsonSuccess, jsonSuccessArray, parameters, stdErrors } from "../components/helpers.js";

const bearer = [{ bearerAuth: [] }];

export const auditPaths: OpenAPIV3.PathsObject = {
  "/api/v1/audit-log": {
    get: {
      tags: ["Audit Log"],
      summary: "List audit events",
      operationId: "auditList",
      security: bearer,
      parameters: [
        parameters.page,
        parameters.limit,
        { name: "caseId", in: "query", schema: { $ref: "#/components/schemas/Uuid" } },
        { name: "type", in: "query", schema: { $ref: "#/components/schemas/AuditEventType" } },
        { name: "status", in: "query", schema: { type: "string", enum: ["Success", "Failed", "Pending"] } },
        { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
        { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
      ],
      responses: {
        "200": jsonSuccessArray("#/components/schemas/AuditEvent"),
        ...stdErrors,
      },
    },
  },
  "/api/v1/audit-log/export": {
    get: {
      tags: ["Audit Log"],
      summary: "Export audit log CSV",
      operationId: "auditExport",
      security: bearer,
      description: "Admin only.",
      parameters: [
        { name: "caseId", in: "query", schema: { $ref: "#/components/schemas/Uuid" } },
        { name: "type", in: "query", schema: { $ref: "#/components/schemas/AuditEventType" } },
      ],
      responses: {
        "200": { description: "CSV file", content: { "text/csv": { schema: { type: "string" } } } },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
};

export const notificationsPaths: OpenAPIV3.PathsObject = {
  "/api/v1/notifications": {
    get: {
      tags: ["Notifications"],
      summary: "List notifications for current user",
      operationId: "notificationsList",
      security: bearer,
      parameters: [parameters.page, parameters.limit],
      responses: {
        "200": jsonSuccessArray("#/components/schemas/Notification"),
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/v1/notifications/read-all": {
    patch: {
      tags: ["Notifications"],
      summary: "Mark all notifications read",
      operationId: "notificationsReadAll",
      security: bearer,
      responses: {
        "200": jsonSuccess("#/components/schemas/HealthResponse", "All marked read"),
      },
    },
  },
  "/api/v1/notifications/{id}/read": {
    patch: {
      tags: ["Notifications"],
      summary: "Mark notification read",
      operationId: "notificationsMarkRead",
      security: bearer,
      parameters: [parameters.id],
      responses: {
        "200": jsonSuccess("#/components/schemas/HealthResponse", "Marked read"),
      },
    },
  },
  "/api/v1/notifications/{id}": {
    delete: {
      tags: ["Notifications"],
      summary: "Delete notification",
      operationId: "notificationsDelete",
      security: bearer,
      parameters: [parameters.id],
      responses: {
        "200": jsonSuccess("#/components/schemas/HealthResponse", "Deleted"),
      },
    },
  },
};
