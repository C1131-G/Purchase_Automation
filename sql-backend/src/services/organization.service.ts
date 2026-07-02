import { eq, and } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema/users";
import { organizations } from "@/db/schema/organizations";
import { userDbAccess } from "@/db/schema/user-db-access";

interface DatabaseItem {
  dbName: string;
  companyName: string;
  dbServer: string;
  isActive: string;
}

export const getAvailableDatabases = async (username?: string): Promise<DatabaseItem[]> => {
  const db = getDb();

  if (!username) {
    return [];
  }

  const results = await db
    .select({
      dbName: organizations.dbName,
      companyName: organizations.companyName,
      dbServer: organizations.dbServer,
      isActive: organizations.isActive,
    })
    .from(organizations)
    .innerJoin(userDbAccess, eq(userDbAccess.dbName, organizations.dbName))
    .innerJoin(users, eq(users.id, userDbAccess.userId))
    .where(and(eq(users.username, username), eq(organizations.isActive, "Y")));

  return results;
};

export const organizationService = { getAvailableDatabases };
