// Authentication DAL: Handles HTTP requests for user authentication, managing login and logout cycles.

import type { RequestHandler } from "express";

// Core
import { logger } from "@/core/logger/pino-logger";
import { purgeCache } from "@/core/utils/cache";
import type { LoginResponse } from "@/dal/types/auth.types";
// Services
import { authService } from "@/services/auth.service";
import { organizationService } from "@/services/organization.service";

// Authenticates user credentials against SAP B1 via the Service Layer.
export const login: RequestHandler = async (req, res, next) => {
  try {
    const { username, password, companyDB } = req.body;

    logger.info({ dbName: companyDB, msg: "Login attempt", username });

    // Step 1: Validate credentials and obtain a session ID from SAP.
    const result: LoginResponse = await authService.login(username, password, companyDB);

    // Step 2: Look up the company name for the selected database.
    const org = await organizationService.getDatabaseById(companyDB);
    const companyName = org?.companyName ?? companyDB;

    // Step 3: Regenerate the Express session to prevent session fixation attacks.
    req.session.regenerate((err) => {
      if (err) {
        return next(err);
      }

      const { session } = req;
      // Step 3: Store tenant and user context in the session for use in subsequent requests.
      session.sessionId = result.sessionId;
      session.dbName = companyDB;
      session.user = { ...result.user, companyName };
      session.userAgent = req.headers["user-agent"];
      // Store SAP SL credentials encrypted in session so middleware can auto-reconnect after restart.
      session.slCompanyDB = companyDB;
      session.slUsername = result.slUsername ?? "";
      session.slPassword = result.slPassword ?? "";

      logger.info({ msg: "Login successful", username });

      res.status(200).json({
        data: {
          sessionTimeout: result.sessionTimeout,
          user: { ...result.user, companyName },
        },
        success: true,
      });
    });
  } catch (error) {
    next(error);
  }
};

// Returns the authenticated user's profile stored in the current session.
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

// Terminates the SAP Service Layer session and destroys the application's Express session.
export const logout: RequestHandler = async (req, res, next) => {
  try {
    const { sessionId, dbName } = req.session;

    logger.info({
      msg: "Logout attempt",
      sessionId: sessionId ? "present" : "missing",
    });

    // Log out from SAP first to release server-side resources.
    if (sessionId) {
      try {
        await authService.logout(sessionId);
      } catch (error) {
        // Log but don't block: SAP session might have already expired.
        logger.error({
          error: (error as Error).message,
          msg: "SAP logout error",
        });
      }
    }

    // Clear the local session and the associated cookie.
    if (dbName) {
      purgeCache(`master:${dbName}:`);
      purgeCache(`dash:sales:${dbName}:`);
      purgeCache(`dash:purchase:${dbName}:`);
      purgeCache(`user:${dbName}:`);
      purgeCache(`creds:${dbName}`);
      logger.info({ dbName, msg: "Tenant cache purged on logout" });
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
