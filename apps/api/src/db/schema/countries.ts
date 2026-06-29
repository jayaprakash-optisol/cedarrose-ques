import { pgTable, serial, varchar, char } from "drizzle-orm/pg-core";

export const countries = pgTable("countries", {
  countryId: serial("CountryID").primaryKey(),
  name: varchar("Name", { length: 100 }).notNull().unique(),
  code: char("Code", { length: 2 }),
});
