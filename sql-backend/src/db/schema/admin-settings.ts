import { pgTable, text } from "drizzle-orm/pg-core";

export const adminSettings = pgTable("admin_settings", {
  code: text("code").primaryKey(),
  value: text("value"),
});
