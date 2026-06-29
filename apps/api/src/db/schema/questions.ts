import { pgTable, uuid, text, varchar, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { sections } from "./sections.js";
import type { ConditionDef, TableColumnDef, ValidationDef } from "../../shared/types/common.js";

export const questions = pgTable("questions", {
  questionId: uuid("QuestionID").primaryKey().defaultRandom(),
  sectionId: uuid("SectionID")
    .notNull()
    .references(() => sections.sectionId, { onDelete: "cascade" }),
  label: text("Label").notNull(),
  fieldType: varchar("FieldType", { length: 20 }).notNull(),
  mandatory: boolean("Mandatory").notNull().default(false),
  prefill: boolean("Prefill").notNull().default(false),
  systemControlled: boolean("SystemControlled").notNull().default(false),
  repeater: boolean("Repeater").notNull().default(false),
  attachUpload: boolean("AttachUpload").notNull().default(false),
  sameAsToggleLabel: varchar("SameAsToggleLabel", { length: 200 }),
  note: text("Note"),
  helpText: text("HelpText"),
  placeholder: text("Placeholder"),
  options: jsonb("Options").$type<string[]>(),
  tableColumns: jsonb("TableColumns").$type<TableColumnDef[]>(),
  validation: jsonb("Validation").$type<ValidationDef>(),
  condition: jsonb("Condition").$type<ConditionDef>(),
  orderIndex: integer("OrderIndex").notNull().default(0),
  createdAt: timestamp("CreatedAt").notNull().defaultNow(),
  updatedAt: timestamp("UpdatedAt").notNull().defaultNow(),
});
