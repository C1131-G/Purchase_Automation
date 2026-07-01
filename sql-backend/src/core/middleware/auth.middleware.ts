import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";

export async function validateSession(req: Request, res: Response, next: NextFunction) {
  const { session } = req;

  if (!session || !session.user) {
    logger.warn({ path: req.path }, "Session validation failed: no session or user");
    return res.status(401).json({
      message: "Authentication required",
      success: false,
    });
  }

  next();
}
