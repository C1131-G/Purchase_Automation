import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const unitOfMeasurements = pgTable("unit_of_measurements", {
  code: text("code").primaryKey(),
  entry: integer("entry").notNull(),
  name: text("name").notNull(),
});
