import type { NextFunction, Request, RequestHandler, Response } from "express";

import { logger } from "@/core/logger/pino-logger";

export const validateSession: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { session } = req;

  if (!session || !session.user) {
    if (req.path !== "/me") {
      logger.warn({
        event: "session_validation_failed",
        path: req.path,
        reason: "no_session_or_user",
      });
    }

    return res.status(401).json({
      message: "Authentication required",
      success: false,
    });
  }

  req.user = {
    ...session.user,
    dbName: session.dbName,
  };

  next();
};
