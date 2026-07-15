import type { NextFunction, Request, Response } from "express";

import { bindRequestLogger, logger } from "@/core/logger/pino-logger";

export async function validateSession(req: Request, res: Response, next: NextFunction) {
  const { session } = req;
  const log = req.log || logger;

  if (!session || !session.user) {
    log.warn({ path: req.path }, "Session validation failed: no session or user");
    return res.status(401).json({
      message: "Authentication required",
      success: false,
    });
  }

  // Bind authenticated user onto the request logger for the rest of the chain (req.log + ALS).
  if (req.log) {
    req.log = req.log.child({
      dbName: session.user.dbName,
      userId: session.user.userName,
    });
    bindRequestLogger(req.log);
  }

  next();
}
