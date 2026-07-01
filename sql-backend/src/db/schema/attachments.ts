import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  absEntry: integer("abs_entry"),
  sourcePath: text("source_path"),
  fileName: text("file_name"),
  fileExtension: text("file_extension"),
  freeText: text("free_text"),
  attachmentDate: date("attachment_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
