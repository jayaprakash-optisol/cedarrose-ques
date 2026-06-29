import { pgTable, uuid, varchar, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const companies = pgTable("companies", {
  companyId: uuid("CompanyID").primaryKey().defaultRandom(),
  companyName: varchar("CompanyName", { length: 100 }).notNull(),
  crisNumber: varchar("CRISNumber", { length: 50 }).notNull(),
  createdAt: timestamp("CreatedAt").notNull().defaultNow(),
  updatedAt: timestamp("UpdatedAt").notNull().defaultNow(),
  country: varchar("Country", { length: 100 }),
  riskRating: varchar("RiskRating", { length: 10 }),
  incorporationDate: date("IncorporationDate"),
  legalStructure: varchar("LegalStructure", { length: 100 }),
  primaryIndustry: varchar("PrimaryIndustry", { length: 100 }),
});

export const companyRecipientEmails = pgTable("company_recipient_emails", {
  emailId: uuid("EmailID").primaryKey().defaultRandom(),
  companyId: uuid("CompanyID")
    .notNull()
    .references(() => companies.companyId, { onDelete: "cascade" }),
  email: varchar("Email", { length: 255 }).notNull(),
  isPrimary: boolean("IsPrimary").notNull().default(false),
  createdAt: timestamp("CreatedAt").notNull().defaultNow(),
});

export const userPlatforms = pgTable("user_platforms", {
  platformId: uuid("PlatformID").primaryKey().defaultRandom(),
  userId: uuid("UserID").notNull().references(() => users.userId, { onDelete: "cascade" }),
  platform: varchar("Platform", { length: 50 }).notNull(),
  role: varchar("Role", { length: 20 }).notNull(),
  createdAt: timestamp("CreatedAt").notNull().defaultNow(),
});
