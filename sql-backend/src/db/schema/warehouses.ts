import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const warehouses = pgTable("warehouses", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  inactive: boolean("inactive").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
