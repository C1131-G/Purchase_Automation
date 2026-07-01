import { boolean, pgTable, text } from "drizzle-orm/pg-core";

export const chartOfAccounts = pgTable("chart_of_accounts", {
  code: text("code").primaryKey(),
  name: text("name"),
  postable: boolean("postable"),
  finance: boolean("finance"),
});
