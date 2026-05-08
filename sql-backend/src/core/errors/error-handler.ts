import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";

import type { RequestWithSession } from "@/core/errors/types/error.types";
import { logger } from "@/core/logger/pino-logger";

// Global Error Handler: Middleware that captures all unhandled exceptions and structured AppErrors from the Express pipeline.
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const error = err instanceof Error ? err : new Error(String(err));
  if (res.headersSent) {
    return _next(error);
  }
  const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
  const message = error.message || "Internal Server Error";
  const errorCode = (error as Error & { errorCode?: string }).errorCode || "UNKNOWN_ERROR";

  const reqWithSession = req as RequestWithSession;
  const log = reqWithSession.log || logger;

  log.error({
    error: message,
    method: req.method,
    msg: "Error handled",
    path: req.path,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    statusCode,
    userId: reqWithSession.session?.user?.id,
  });

  const isMissingSessionFile =
    message.includes("ENOENT") &&
    message.includes("sessions") &&
    (message.includes(".json") || req.path.startsWith("/api/v1"));
  if (isMissingSessionFile) {
    res.clearCookie("vendorportal.sid");
    return res.status(401).json({
      errorCode: "SESSION_EXPIRED",
      message: "Session expired",
      status: 401,
      success: false,
    });
  }

  if (statusCode === 401 && reqWithSession.session) {
    reqWithSession.session.destroy(() => {
      if (res.headersSent) {
        return;
      }
      res.clearCookie("vendorportal.sid");
      return res.status(401).json({
        errorCode: "SESSION_EXPIRED",
        message: "Session expired",
        status: 401,
        success: false,
      });
    });
    return;
  }

  if (error.name === "ZodError") {
    const zodError = error as unknown as ZodError;
    return res.status(400).json({
      details: zodError.errors.map((zErr) => ({
        field: zErr.path.join("."),
        message: zErr.message,
      })),
      errorCode: "VALIDATION_ERROR",
      message: "Validation failed",
      status: 400,
      success: false,
    });
  }

  res.status(statusCode).json({
    details: (error as Error & { details?: unknown }).details,
    errorCode,
    message,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    status: statusCode,
    success: false,
  });
};
