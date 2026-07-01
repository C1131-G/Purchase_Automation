import { date, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const goodsIssues = pgTable("goods_issues", {
  id: serial("id").primaryKey(),
  docNum: integer("doc_num").notNull(),
  docDate: date("doc_date").notNull(),
  taxDate: date("tax_date"),
  comments: text("comments"),
  docTotal: numeric("doc_total", { precision: 19, scale: 6 }),
  docCurrency: text("doc_currency"),
  docStatus: text("doc_status").default("O"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
