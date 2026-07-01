import { integer, numeric, pgTable, serial, text } from "drizzle-orm/pg-core";

export const inventoryTransferLines = pgTable("inventory_transfer_lines", {
  id: serial("id").primaryKey(),
  docEntry: integer("doc_entry").notNull(),
  lineNum: integer("line_num").notNull(),
  itemCode: text("item_code").notNull(),
  dscription: text("dscription"),
  quantity: numeric("quantity", { precision: 19, scale: 6 }).notNull(),
  fromWarehouseCode: text("from_warehouse_code"),
  warehouseCode: text("warehouse_code"),
  baseType: integer("base_type"),
  baseEntry: integer("base_entry"),
  baseLine: integer("base_line"),
});
