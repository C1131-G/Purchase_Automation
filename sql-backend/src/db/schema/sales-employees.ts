import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";

export const salesEmployees = pgTable("sales_employees", {
  code: integer("code").primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").default(true),
});
