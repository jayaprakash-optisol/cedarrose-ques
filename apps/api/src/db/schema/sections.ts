import { pgTable, uuid, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { templates } from "./templates.js";

export const sections = pgTable("sections", {
  sectionId: uuid("SectionID").primaryKey().defaultRandom(),
  templateId: uuid("TemplateID")
    .notNull()
    .references(() => templates.templateId, { onDelete: "cascade" }),
  title: varchar("Title", { length: 255 }).notNull(),
  description: text("Description"),
  banner: text("Banner"),
  orderIndex: integer("OrderIndex").notNull().default(0),
  createdAt: timestamp("CreatedAt").notNull().defaultNow(),
});
