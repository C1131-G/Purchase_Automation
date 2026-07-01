import { date, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const salesOrders = pgTable("sales_orders", {
  id: serial("id").primaryKey(),
  docNum: integer("doc_num").notNull(),
  docDate: date("doc_date").notNull(),
  docDueDate: date("doc_due_date"),
  cardCode: text("card_code").notNull(),
  cardName: text("card_name"),
  docTotal: numeric("doc_total", { precision: 19, scale: 6 }),
  docCurrency: text("doc_currency"),
  docStatus: text("doc_status").default("O"),
  canceled: text("canceled"),
  address: text("address"),
  address2: text("address2"),
  comments: text("comments"),
  numAtCard: text("num_at_card"),
  salesPersonCode: integer("sales_person_code"),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
  attachmentEntry: integer("attachment_entry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
