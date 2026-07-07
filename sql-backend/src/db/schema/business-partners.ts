import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const businessPartners = pgTable("business_partners", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull().default("S"),
  currency: text("currency"),
  salesEmployeeCode: integer("sales_employee_code"),
  phone: text("phone"),
  email: text("email"),
  billToAddress: text("bill_to_address"),
  shipToAddress: text("ship_to_address"),
  billToDef: text("bill_to_def"),
  shipToDef: text("ship_to_def"),
  frozen: boolean("frozen").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
