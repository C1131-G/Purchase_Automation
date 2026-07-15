import { and, eq } from "drizzle-orm";

import { organizations } from "@/db/schema/organizations";
import { userDbAccess } from "@/db/schema/user-db-access";
import { users } from "@/db/schema/users";
import type { LooseDb } from "@/types/db.types";

export const authRepository = {
  async findUserByUsername(db: LooseDb, username: string) {
    const [row] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return row || null;
  },

  async findUserDbAccess(db: LooseDb, userId: number, dbName: string) {
    const [row] = await db
      .select()
      .from(userDbAccess)
      .where(and(eq(userDbAccess.userId, userId), eq(userDbAccess.dbName, dbName)))
      .limit(1);
    return row || null;
  },

  async findOrganizationByDbName(db: LooseDb, dbName: string) {
    const [row] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.dbName, dbName))
      .limit(1);
    return row || null;
  },
};
