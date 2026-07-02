import { pgTable, uuid, varchar, date, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

export const companyRequests = pgTable(
  "company_requests",
  {
    companyRequestId: uuid("CompanyRequestID").primaryKey().defaultRandom(),
    orderId: varchar("OrderID", { length: 100 }).notNull(),
    externalRef: varchar("ExternalRef", { length: 100 }).notNull(),
    companyName: varchar("CompanyName", { length: 255 }).notNull(),
    country: varchar("Country", { length: 100 }).notNull(),
    riskRating: varchar("RiskRating", { length: 10 }),
    incorporationDate: date("IncorporationDate"),
    legalStructure: varchar("LegalStructure", { length: 100 }),
    primaryIndustry: varchar("PrimaryIndustry", { length: 100 }),
    recipientType: varchar("RecipientType", { length: 50 }),
    recipientEmails: jsonb("RecipientEmails").notNull().$type<string[]>(),
    status: varchar("Status", { length: 20 }).notNull().default("Pending"),
    rawPayload: jsonb("RawPayload").notNull(),
    receivedAt: timestamp("ReceivedAt").notNull().defaultNow(),
    consumedAt: timestamp("ConsumedAt"),
    caseId: uuid("CaseID"),
    createdAt: timestamp("CreatedAt").notNull().defaultNow(),
    updatedAt: timestamp("UpdatedAt").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_company_requests_order_ext_ref").on(table.orderId, table.externalRef),
  ]
);
