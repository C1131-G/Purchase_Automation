import { date, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const apCreditMemos = pgTable("ap_credit_memos", {
  id: serial("id").primaryKey(),
  docNum: integer("doc_num").notNull(),
  docDate: date("doc_date").notNull(),
  docDueDate: date("doc_due_date"),
  cardCode: text("card_code").notNull(),
  cardName: text("card_name"),
  docTotal: numeric("doc_total", { precision: 19, scale: 6 }),
  docCurrency: text("doc_currency"),
  docStatus: text("doc_status").default("O"),
  paidToDate: numeric("paid_to_date", { precision: 19, scale: 6 }),
  address: text("address"),
  address2: text("address2"),
  attachmentEntry: integer("attachment_entry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
