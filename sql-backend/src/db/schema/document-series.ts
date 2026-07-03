import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const documentSeries = pgTable("document_series", {
  id: serial("id").primaryKey(),
  documentType: text("document_type").notNull().unique(),
  nextNum: integer("next_num").notNull(),
  seriesName: text("series_name").notNull().default("Primary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
