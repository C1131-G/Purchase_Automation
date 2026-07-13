import { integer, numeric, pgTable, serial, text } from "drizzle-orm/pg-core";

export const salesQuotationLines = pgTable("sales_quotation_lines", {
  id: serial("id").primaryKey(),
  docEntry: integer("doc_entry").notNull(),
  lineNum: integer("line_num").notNull(),
  itemCode: text("item_code").notNull(),
  itemDescription: text("item_description"),
  quantity: numeric("quantity", { precision: 19, scale: 6 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 19, scale: 6 }),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
  vatGroup: text("vat_group"),
  vatPercent: numeric("vat_percent", { precision: 5, scale: 2 }),
  warehouseCode: text("warehouse_code"),
  uomCode: text("uom_code"),
  uomEntry: integer("uom_entry"),
  lineTotal: numeric("line_total", { precision: 19, scale: 6 }),
  baseEntry: integer("base_entry"),
  baseLine: integer("base_line"),
  baseType: integer("base_type"),
  baseQuantity: numeric("base_quantity", { precision: 19, scale: 6 }),
});
