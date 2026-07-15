import { and, eq } from "drizzle-orm";

import { organizations } from "@/db/schema/organizations";
import { userDbAccess } from "@/db/schema/user-db-access";
import { users } from "@/db/schema/users";
import type { LooseDb } from "@/types/db.types";

export const organizationRepository = {
  async findAvailableDatabases(db: LooseDb, username: string) {
    return db
      .select({
        companyName: organizations.companyName,
        dbName: organizations.dbName,
        dbServer: organizations.dbServer,
        isActive: organizations.isActive,
      })
      .from(organizations)
      .innerJoin(userDbAccess, eq(userDbAccess.dbName, organizations.dbName))
      .innerJoin(users, eq(users.id, userDbAccess.userId))
      .where(and(eq(users.username, username), eq(organizations.isActive, "Y")));
  },
};
