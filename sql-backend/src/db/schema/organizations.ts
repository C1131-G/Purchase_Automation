import { pgTable, text, timestamp, serial } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  dbName: text("db_name").notNull().unique(),
  dbServer: text("db_server").notNull().default("localhost"),
  isActive: text("is_active").notNull().default("Y"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
