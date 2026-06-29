import { pgTable, uuid, varchar, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { cases } from "./cases.js";
import { users } from "./users.js";

export const auditEvents = pgTable("audit_events", {
  auditId: uuid("AuditID").primaryKey().defaultRandom(),
  caseId: uuid("CaseID").references(() => cases.caseId),
  caseSubject: varchar("CaseSubject", { length: 255 }),
  caseOrderId: varchar("CaseOrderID", { length: 100 }),
  step: integer("Step"),
  eventType: varchar("EventType", { length: 30 }).notNull(),
  description: text("Description").notNull(),
  triggeredBy: varchar("TriggeredBy", { length: 255 }),
  triggeredByUserId: uuid("TriggeredByUserID").references(() => users.userId),
  status: varchar("Status", { length: 10 }).notNull().default("Success"),
  payload: jsonb("Payload"),
  createdAt: timestamp("CreatedAt").notNull().defaultNow(),
});
