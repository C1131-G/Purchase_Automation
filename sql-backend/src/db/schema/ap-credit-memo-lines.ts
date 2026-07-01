import { integer, numeric, pgTable, serial, text } from "drizzle-orm/pg-core";

export const apCreditMemoLines = pgTable("ap_credit_memo_lines", {
  id: serial("id").primaryKey(),
  docEntry: integer("doc_entry").notNull(),
  lineNum: integer("line_num").notNull(),
  itemCode: text("item_code").notNull(),
  itemDescription: text("item_description"),
  quantity: numeric("quantity", { precision: 19, scale: 6 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 19, scale: 6 }),
  baseEntry: integer("base_entry"),
  baseLine: integer("base_line"),
  baseType: integer("base_type"),
  baseQuantity: numeric("base_quantity", { precision: 19, scale: 6 }),
});
