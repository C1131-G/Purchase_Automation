import { date, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const grpo = pgTable("grpo", {
  id: serial("id").primaryKey(),
  docNum: integer("doc_num").notNull(),
  docDate: date("doc_date").notNull(),
  docDueDate: date("doc_due_date"),
  cardCode: text("card_code").notNull(),
  cardName: text("card_name"),
  docTotal: numeric("doc_total", { precision: 19, scale: 6 }),
  docCurrency: text("doc_currency"),
  docStatus: text("doc_status").default("O"),
  address: text("address"),
  address2: text("address2"),
  comments: text("comments"),
  attachmentEntry: integer("attachment_entry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
