import { pgTable, integer, text, timestamp, serial } from "drizzle-orm/pg-core";
import { users } from "./users";
import { organizations } from "./organizations";

export const userDbAccess = pgTable("user_db_access", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  dbName: text("db_name")
    .notNull()
    .references(() => organizations.dbName, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
