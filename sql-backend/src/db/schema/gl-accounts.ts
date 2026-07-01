import { pgTable, text } from "drizzle-orm/pg-core";

export const glAccounts = pgTable("gl_accounts", {
  glAccount: text("gl_account").primaryKey(),
  account: text("account"),
});
