import { numeric, pgTable, text } from "drizzle-orm/pg-core";

export const itemWarehouseStock = pgTable(
  "item_warehouse_stock",
  {
    itemCode: text("item_code").notNull(),
    warehouseCode: text("warehouse_code").notNull(),
    onHand: numeric("on_hand", { precision: 19, scale: 6 }),
  },
  (table) => ({
    pk: { columns: [table.itemCode, table.warehouseCode] },
  }),
);
