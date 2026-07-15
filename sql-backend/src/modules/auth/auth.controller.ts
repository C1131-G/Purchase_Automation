import type { RequestHandler } from "express";

import { bindRequestLogger, logger } from "@/core/logger/pino-logger";

import { authService } from "./auth.service";

export const login: RequestHandler = async (req, res, next) => {
  try {
    const { username, password, companyDB } = req.body;

    // Never log password — only username / tenant identifiers.
    logger.info({ companyDB, username }, "Login attempt");

    const result = await authService.login(username, password, companyDB);

    req.session.regenerate((err) => {
      if (err) {
        return next(err);
      }

      req.session.user = {
        companyName: result.user.companyName,
        dbName: result.user.dbName,
        dbServer: result.user.dbServer,
        userName: result.user.userName,
      };

      if (req.log) {
        req.log = req.log.child({
          dbName: result.user.dbName,
          userId: result.user.userName,
        });
        bindRequestLogger(req.log);
      }
      logger.info("Login successful");

      res.status(200).json({
        data: { user: result.user },
        success: true,
      });
    });
  } catch (error) {
    return next(error);
  }
};

export const getCurrentUser: RequestHandler = (req, res, _next) => {
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
};

export const logout: RequestHandler = (req, res, next) => {
  try {
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
    return next(error);
  }
};

export const authController = { getCurrentUser, login, logout };
