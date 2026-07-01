import { pgTable, text } from "drizzle-orm/pg-core";

export const bankDetails = pgTable("bank_details", {
  countryCode: text("country_code").primaryKey(),
  bankCode: text("bank_code"),
  bankName: text("bank_name"),
});
