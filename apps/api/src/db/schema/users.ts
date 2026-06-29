import { pgTable, uuid, varchar, integer, numeric, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  userId: uuid("UserID").primaryKey().defaultRandom(),
  email: varchar("Email", { length: 100 }).notNull().unique(),
  password: varchar("Password", { length: 100 }).notNull(),
  firstName: varchar("FirstName", { length: 50 }).notNull(),
  lastName: varchar("LastName", { length: 50 }).notNull(),
  role: varchar("Role", { length: 20 }).notNull(),
  status: varchar("Status", { length: 20 }).notNull().default("Active"),
  profilePicture: varchar("ProfilePicture", { length: 255 }),
  createdAt: timestamp("CreatedAt").notNull().defaultNow(),
  updatedAt: timestamp("UpdatedAt").notNull().defaultNow(),
  title: varchar("Title", { length: 100 }),
  initials: varchar("Initials", { length: 5 }),
  totalReports: integer("TotalReports"),
  score: numeric("Score", { precision: 5, scale: 2 }),
  lastSubmission: timestamp("LastSubmission"),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
