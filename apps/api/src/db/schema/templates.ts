import { pgTable, uuid, varchar, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const templates = pgTable("templates", {
  templateId: uuid("TemplateID").primaryKey().defaultRandom(),
  name: varchar("Name", { length: 255 }).notNull(),
  description: text("Description"),
  status: varchar("Status", { length: 10 }).notNull().default("Draft"),
  recipientType: varchar("RecipientType", { length: 50 }),
  version: integer("Version").notNull().default(1),
  createdBy: uuid("CreatedBy").references(() => users.userId),
  updatedBy: uuid("UpdatedBy").references(() => users.userId),
  lastEditedAt: timestamp("LastEditedAt").notNull().defaultNow(),
  createdAt: timestamp("CreatedAt").notNull().defaultNow(),
  updatedAt: timestamp("UpdatedAt").notNull().defaultNow(),
});

export const templateSnapshots = pgTable("template_snapshots", {
  snapshotId: uuid("SnapshotID").primaryKey().defaultRandom(),
  templateId: uuid("TemplateID")
    .notNull()
    .references(() => templates.templateId),
  version: integer("Version").notNull(),
  snapshot: jsonb("Snapshot").notNull(),
  createdAt: timestamp("CreatedAt").notNull().defaultNow(),
});
