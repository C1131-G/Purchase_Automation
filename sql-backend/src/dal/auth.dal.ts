import type { RequestHandler } from "express";

import { logger } from "@/core/logger/pino-logger";
import { authService } from "@/services/auth.service";

export const login: RequestHandler = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    logger.info({ username }, "Login attempt");

    const result = await authService.login(username, password);

    req.session.regenerate(async (err) => {
      if (err) return next(err);

      req.session.user = {
        companyName: result.user.companyName,
        userName: result.user.userName,
      };

      logger.info({ username }, "Login successful");

      res.status(200).json({
        data: { user: result.user },
        success: true,
      });
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser: RequestHandler = async (req, res, _next) => {
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

export const logout: RequestHandler = async (req, res, next) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        logger.error({ error: err }, "Session destroy error");
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

export const authDal = { getCurrentUser, login, logout };
