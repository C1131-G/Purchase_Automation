import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";

import { logger } from "@/core/logger/pino-logger";

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const error = err instanceof Error ? err : new Error(String(err));
  if (res.headersSent) {
    return _next(error);
  }

  const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
  const message = error.message || "Internal Server Error";
  const errorCode = (error as Error & { errorCode?: string }).errorCode || "UNKNOWN_ERROR";

  logger.error({
    msg: "Error handled",
    error: message,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    statusCode,
    path: req.path,
    method: req.method,
  });

  if (error.name === "ZodError") {
    const zodError = error as unknown as ZodError;
    return res.status(400).json({
      details: zodError.issues.map((zErr) => ({
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
