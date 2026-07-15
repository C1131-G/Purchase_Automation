import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";

import type { RequestWithSession } from "@/core/errors/types/error.types";
import { logger } from "@/core/logger/pino-logger";

// Global Error Handler: Middleware that captures all unhandled exceptions and structured AppErrors from the Express pipeline.
// It ensures that the client always receives a standardized JSON response and that errors are recorded in the central log.
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const error = err instanceof Error ? err : new Error(String(err));
  if (res.headersSent) {
    return _next(error);
  }
  const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
  const message = error.message || "Internal Server Error";
  const errorCode = (error as Error & { errorCode?: string }).errorCode || "UNKNOWN_ERROR";

  // Use the logger attached to the request (if available) for better trace correlation, otherwise fallback to the global pino instance.
  const reqWithSession = req as RequestWithSession;
  const log = reqWithSession.log || logger;

  log.error(
    {
      err: error,
      method: req.method,
      path: req.path,
      statusCode,
      userId: reqWithSession.session?.user?.id,
    },
    "Error handled",
  );

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

  // Strict mode: destroy local session immediately on unauthorized responses.
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

  // Zod Integration: Converts standard Zod validation errors into a friendly format with field-specific messages for the frontend.
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

  // Final Response: Standardized JSON payload containing status, message, and a unique error code for logic-based error handling in the UI.
  res.status(statusCode).json({
    details: (error as Error & { details?: unknown }).details,
    errorCode,
    message,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    status: statusCode,
    success: false,
  });
};
