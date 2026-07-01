import { date, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const incomingPayments = pgTable("incoming_payments", {
  id: serial("id").primaryKey(),
  docNum: integer("doc_num").notNull(),
  docDate: date("doc_date").notNull(),
  cardCode: text("card_code").notNull(),
  cardName: text("card_name"),
  docTotal: numeric("doc_total", { precision: 19, scale: 6 }),
  docCurrency: text("doc_currency"),
  counterRef: text("counter_ref"),
  paymentMode: text("payment_mode"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
