import { boolean, numeric, pgTable, text } from "drizzle-orm/pg-core";

export const taxGroups = pgTable("tax_groups", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  rate: numeric("rate", { precision: 5, scale: 2 }).notNull(),
  inactive: boolean("inactive").default(false),
});
