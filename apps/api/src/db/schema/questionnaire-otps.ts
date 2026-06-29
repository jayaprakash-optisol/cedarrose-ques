import { pgTable, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { cases } from "./cases.js";

export const questionnaireOtps = pgTable("questionnaire_otps", {
  caseId: uuid("CaseID")
    .primaryKey()
    .references(() => cases.caseId, { onDelete: "cascade" }),
  otpHash: varchar("OtpHash", { length: 64 }).notNull(),
  attempts: integer("Attempts").notNull().default(0),
  expiresAt: timestamp("ExpiresAt").notNull(),
});
