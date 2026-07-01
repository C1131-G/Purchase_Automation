import { date, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const inventoryTransferRequests = pgTable("inventory_transfer_requests", {
  id: serial("id").primaryKey(),
  docNum: integer("doc_num").notNull(),
  docDate: date("doc_date").notNull(),
  docStatus: text("doc_status").default("O"),
  comments: text("comments"),
  docTotal: numeric("doc_total", { precision: 19, scale: 6 }),
  filler: text("filler"),
  toWarehouseCode: text("to_warehouse_code"),
  docCurrency: text("doc_currency"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
