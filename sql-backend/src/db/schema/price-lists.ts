import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const priceLists = pgTable("price_lists", {
  id: serial("id").primaryKey(),
  listNum: integer("list_num").notNull().unique(),
  listName: text("list_name").notNull(),
});
