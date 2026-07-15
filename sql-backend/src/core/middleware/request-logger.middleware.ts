import crypto from "node:crypto";

import type { NextFunction, Request, Response } from "express";

import { logger } from "@/core/logger/pino-logger";

/**
 * Middleware that logs HTTP request details using request-scoped pino logger.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  req.id = requestId;
  req.log = logger.child({ requestId });

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    req.log?.info(
      {
        durationMs: duration,
        method: req.method,
        status: res.statusCode,
        url: req.originalUrl,
      },
      `${req.method} ${req.originalUrl} - ${res.statusCode} in ${duration}ms`,
    );
  });

  next();
}
