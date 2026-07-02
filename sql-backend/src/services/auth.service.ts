import { eq, and } from "drizzle-orm";

import { getDb } from "@/db/client";
import { users } from "@/db/schema/users";
import { organizations } from "@/db/schema/organizations";
import { userDbAccess } from "@/db/schema/user-db-access";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";

export const login = async (username: string, password: string, companyDB: string) => {
  const db = getDb();

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (!user) {
    throw new AppError("Invalid username or password", 401, "AUTH_FAILED");
  }

  // Plain password check
  const passwordValid = password === user.password;

  if (!passwordValid) {
    throw new AppError("Invalid username or password", 401, "AUTH_FAILED");
  }

  // Check if the user has access to the requested companyDB
  const access = await db
    .select()
    .from(userDbAccess)
    .where(and(eq(userDbAccess.userId, user.id), eq(userDbAccess.dbName, companyDB)))
    .limit(1);

  if (access.length === 0) {
    throw new AppError("You do not have access to this database", 403, "AUTH_FAILED");
  }

  // Retrieve the organization/DB metadata
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.dbName, companyDB))
    .limit(1);

  if (!org) {
    throw new AppError("Selected database metadata not found", 404, "AUTH_FAILED");
  }

  logger.info({ username, companyDB }, "User login successful");

  return {
    user: {
      dbName: org.dbName,
      dbServer: org.dbServer,
      userName: user.username,
      companyName: org.companyName,
    },
  };
};

export const authService = { login };
