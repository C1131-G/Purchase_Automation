import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const businessPartnerAddresses = pgTable("business_partner_addresses", {
  id: serial("id").primaryKey(),
  cardCode: text("card_code").notNull(),
  addressType: text("address_type").notNull(),
  address: text("address"),
  street: text("street"),
  block: text("block"),
  city: text("city"),
  zipCode: text("zip_code"),
  state: text("state"),
  country: text("country"),
});
