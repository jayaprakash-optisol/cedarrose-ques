import { pgTable, uuid, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { cases } from "./cases.js";
import { questions } from "./questions.js";
import { sections } from "./sections.js";

export const questionnaireResponses = pgTable("questionnaire_responses", {
  responseId: uuid("ResponseID").primaryKey().defaultRandom(),
  caseId: uuid("CaseID")
    .notNull()
    .references(() => cases.caseId, { onDelete: "cascade" }),
  questionId: uuid("QuestionID").references(() => questions.questionId),
  sectionId: uuid("SectionID").references(() => sections.sectionId),
  question: text("Question").notNull(),
  answer: text("Answer"),
  mandatory: boolean("Mandatory").notNull().default(true),
  language: varchar("Language", { length: 10 }),
  createdAt: timestamp("CreatedAt").notNull().defaultNow(),
  updatedAt: timestamp("UpdatedAt").notNull().defaultNow(),
});
