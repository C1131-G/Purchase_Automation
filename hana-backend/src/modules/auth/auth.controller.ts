// Authentication handlers: session login, profile, logout.

import type { RequestHandler } from "express";

import { bindRequestLogger, logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import { organizationService } from "@/modules/organization/organization.service";

import type { LoginResponse } from "./auth.types";
import { authService } from "./auth.service";

export const login: RequestHandler = async (req, res, next) => {
  try {
    const { username, password, companyDB } = req.body;

    // Never log password — only username / tenant identifiers.
    logger.info({ dbName: companyDB, username }, "Login attempt");

    const loginResponse: LoginResponse = await authService.login(username, password, companyDB);

    const organization = await organizationService.getDatabaseById(companyDB);
    const companyName = organization?.companyName ?? companyDB;

    req.session.regenerate((err) => {
      if (err) {
        return next(err);
      }

      const { session } = req;
      session.sessionId = loginResponse.sessionId;
      session.dbName = companyDB;
      session.user = { ...loginResponse.user, companyName };
      session.userAgent = req.headers["user-agent"];
      session.slCompanyDB = companyDB;
      session.slUsername = loginResponse.slUsername ?? "";
      session.slPassword = loginResponse.slPassword ?? "";

      if (req.log) {
        req.log = req.log.child({ userId: loginResponse.user.userName, dbName: companyDB });
        bindRequestLogger(req.log);
      }
      logger.info("Login successful");

      res.status(200).json({
        data: {
          sessionTimeout: loginResponse.sessionTimeout,
          user: { ...loginResponse.user, companyName },
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

    logger.info({ hasSessionId: Boolean(sessionId) }, "Logout attempt");

    if (sessionId) {
      try {
        await authService.logout(sessionId);
      } catch (error) {
        logger.error(
          { err: error instanceof Error ? error : new Error(String(error)) },
          "SAP logout error",
        );
      }
    }

    if (dbName) {
      purgeCache(`master:${dbName}:`);
      purgeCache(`dash:sales:${dbName}:`);
      purgeCache(`dash:purchase:${dbName}:`);
      purgeCache(`user:${dbName}:`);
      purgeCache(`creds:${dbName}`);
      logger.info({ dbName }, "Tenant cache purged on logout");
    }

    req.session.destroy((err) => {
      if (err) {
        logger.error({ err }, "Session destroy error");
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

export const authController = {
  getCurrentUser,
  login,
  logout,
};
