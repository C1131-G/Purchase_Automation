import { integer, numeric, pgTable, text } from "drizzle-orm/pg-core";

export const itemPrices = pgTable(
  "item_prices",
  {
    itemCode: text("item_code").notNull(),
    priceList: integer("price_list").notNull(),
    price: numeric("price", { precision: 19, scale: 6 }),
  },
  (table) => ({
    pk: { columns: [table.itemCode, table.priceList] },
  }),
);
