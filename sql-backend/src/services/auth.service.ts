import bcrypt from "bcrypt";

import { logger } from "@/core/logger/pino-logger";
import type { LoginResponse } from "@/dal/types/auth.types";
import { getTenantDataSource } from "@/db/config/data-source";
import { UserSchema } from "@/db/schemas/user.schema";

export const login = async (
  username: string,
  password: string,
  dbName: string,
): Promise<LoginResponse> => {
  try {
    const ds = await getTenantDataSource(dbName);
    const userRepo = ds.getRepository(UserSchema);

    const user = await userRepo.findOne({
      where: { username: username.toUpperCase() },
    });

    if (!user) {
      const error = new Error("Invalid username or password") as Error & {
        statusCode: number;
      };
      error.statusCode = 401;
      throw error;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      const error = new Error("Invalid username or password") as Error & {
        statusCode: number;
      };
      error.statusCode = 401;
      throw error;
    }

    const sessionId = `sql_${Date.now()}_${Math.random().toString(36).slice(7)}`;

    logger.info({ company: dbName, msg: "User login success", username });

    return {
      sessionId,
      sessionTimeout: 1800,
      user: {
        dbName,
        userName: user.name || username,
      },
    };
  } catch (err: unknown) {
    const caughtError = err instanceof Error ? err : new Error(String(err));
    logger.error({
      company: dbName,
      error: caughtError.message,
      msg: "User login failed",
      username,
    });
    throw caughtError;
  }
};

export const logout = async (_sessionId: string): Promise<void> => {
  logger.info({ msg: "User logged out" });
};

export const authService = {
  login,
  logout,
};
