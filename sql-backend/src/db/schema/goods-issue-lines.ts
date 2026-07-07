import { integer, jsonb, numeric, pgTable, serial, text } from "drizzle-orm/pg-core";

export const goodsIssueLines = pgTable("goods_issue_lines", {
  id: serial("id").primaryKey(),
  docEntry: integer("doc_entry").notNull(),
  lineNum: integer("line_num").notNull(),
  itemCode: text("item_code").notNull(),
  dscription: text("dscription"),
  quantity: numeric("quantity", { precision: 19, scale: 6 }).notNull(),
  price: numeric("price", { precision: 19, scale: 6 }),
  warehouseCode: text("warehouse_code"),
  acctCode: text("acct_code"),
  ocrCode: text("ocr_code"),
  uomCode: text("uom_code"),
  unitMsr: text("unit_msr"),
  binAllocations: jsonb("bin_allocations"),
  baseType: integer("base_type"),
  baseEntry: integer("base_entry"),
  baseLine: integer("base_line"),
});
