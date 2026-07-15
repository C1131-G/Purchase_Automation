import { AppError } from "@/core/errors/app-error";
import { logger } from "@/core/logger/pino-logger";
import { recordAuthLogin } from "@/core/observability/metrics";
import { getDb } from "@/db/client";

import { authRepository } from "./auth.repository";

export const login = async (username: string, password: string, companyDB: string) => {
  const db = getDb();

  try {
    const user = await authRepository.findUserByUsername(db, username);
    if (!user) {
      recordAuthLogin("fail");
      throw new AppError("Invalid username or password", 401, "AUTH_FAILED");
    }

    const passwordValid = password === user.password;
    if (!passwordValid) {
      recordAuthLogin("fail");
      throw new AppError("Invalid username or password", 401, "AUTH_FAILED");
    }

    const access = await authRepository.findUserDbAccess(db, user.id, companyDB);
    if (!access) {
      recordAuthLogin("fail");
      throw new AppError("You do not have access to this database", 403, "AUTH_FAILED");
    }

    const org = await authRepository.findOrganizationByDbName(db, companyDB);
    if (!org) {
      recordAuthLogin("fail");
      throw new AppError("Selected database metadata not found", 404, "AUTH_FAILED");
    }

    logger.info({ companyDB, username }, "User login successful");
    recordAuthLogin("success");

    return {
      user: {
        companyName: org.companyName,
        dbName: org.dbName,
        dbServer: org.dbServer,
        userName: user.username,
      },
    };
  } catch (err) {
    if (!(err instanceof AppError)) {
      recordAuthLogin("fail");
    }
    throw err;
  }
};

export const authService = { login };
