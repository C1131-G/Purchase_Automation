import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { getDb } from "@/db/client";

import { authRepository } from "./auth.repository";

export const login = async (username: string, password: string, companyDB: string) => {
  const db = getDb();

  const user = await authRepository.findUserByUsername(db, username);
  if (!user) {
    throw new AppError("Invalid username or password", 401, "AUTH_FAILED");
  }

  const passwordValid = password === user.password;
  if (!passwordValid) {
    throw new AppError("Invalid username or password", 401, "AUTH_FAILED");
  }

  const access = await authRepository.findUserDbAccess(db, user.id, companyDB);
  if (!access) {
    throw new AppError("You do not have access to this database", 403, "AUTH_FAILED");
  }

  const org = await authRepository.findOrganizationByDbName(db, companyDB);
  if (!org) {
    throw new AppError("Selected database metadata not found", 404, "AUTH_FAILED");
  }

  logger.info({ companyDB, username }, "User login successful");

  return {
    user: {
      companyName: org.companyName,
      dbName: org.dbName,
      dbServer: org.dbServer,
      userName: user.username,
    },
  };
};

export const authService = { login };
