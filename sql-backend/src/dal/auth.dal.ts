import type { RequestHandler } from "express";

import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import type { LoginResponse } from "@/dal/types/auth.types";
import { authService } from "@/services/auth.service";

export const login: RequestHandler = async (req, res, next) => {
  try {
    const { username, password, companyDB } = req.body;

    logger.info({ dbName: companyDB, msg: "Login attempt", username });

    const result: LoginResponse = await authService.login(username, password, companyDB);

    req.session.regenerate((err) => {
      if (err) {
        return next(err);
      }

      const { session } = req;
      session.sessionId = result.sessionId;
      session.dbName = companyDB;
      session.user = result.user;
      session.userAgent = req.headers["user-agent"];

      logger.info({ msg: "Login successful", username });

      res.status(200).json({
        data: {
          sessionTimeout: result.sessionTimeout,
          user: result.user,
        },
        success: true,
      });
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser: RequestHandler = async (req, res, next) => {
  try {
    const { user } = req.session;

    if (!user) {
      return res.status(401).json({
        message: "Not authenticated",
        success: false,
      });
    }

    res.status(200).json({
      data: { user },
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    const { sessionId, dbName } = req.session;

    logger.info({
      msg: "Logout attempt",
      sessionId: sessionId ? "present" : "missing",
    });

    if (sessionId) {
      try {
        await authService.logout(sessionId);
      } catch (error) {
        logger.error({ error: (error as Error).message, msg: "Logout error" });
      }
    }

    if (dbName) {
      purgeCache(`master:${dbName}:`);
      purgeCache(`dash:sales:${dbName}:`);
      purgeCache(`dash:purchase:${dbName}:`);
    }

    req.session.destroy((err) => {
      if (err) {
        logger.error({ error: err, msg: "Session destroy error" });
        return next(err);
      }

      res.clearCookie("vendorportal.sid");

      res.status(200).json({
        message: "Logged out successfully",
        success: true,
      });
    });
  } catch (error) {
    next(error);
  }
};

export const authDal = {
  getCurrentUser,
  login,
  logout,
};
