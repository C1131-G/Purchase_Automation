import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { users } from "@/db/schema/users";
import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";

export const login = async (username: string, password: string) => {
  const db = getDb();

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (!user) {
    throw new AppError("Invalid username or password", 401, "AUTH_FAILED");
  }

  // Verify password (bcryptjs at runtime)
  const bcrypt = await import("bcryptjs");
  const passwordValid = await bcrypt.compare(password, user.password);

  if (!passwordValid) {
    throw new AppError("Invalid username or password", 401, "AUTH_FAILED");
  }

  logger.info({ username }, "User login successful");

  return {
    user: {
      companyName: user.companyName,
      userName: user.username,
    },
  };
};

export const authService = { login };
