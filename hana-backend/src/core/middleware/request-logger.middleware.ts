// Request-scoped logging: binds requestId on a child logger for the whole request (ALS + req.log).
// Also attaches active OTel trace_id / span_id for log↔trace correlation.

import crypto from "node:crypto";

import type { NextFunction, Request, Response } from "express";

import { logger, runWithRequestLogger } from "@/core/logger/pino-logger";
import { getActiveTraceFields } from "@/core/observability/tracing";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  req.id = requestId;
  res.setHeader("x-request-id", requestId);

  const traceFields = getActiveTraceFields();
  const requestLog = logger.child({ requestId, ...traceFields });
  req.log = requestLog;

  runWithRequestLogger(requestLog, () => {
    res.on("finish", () => {
      const durationMs = Date.now() - startTime;
      // Prefer the latest req.log (may have gained userId after auth / refreshed span ids).
      const active = req.log ?? requestLog;
      const pathOnly = (req.originalUrl || "").split("?")[0] ?? "";
      if (
        pathOnly === "/metrics" ||
        pathOnly.endsWith("/metrics") ||
        ((pathOnly === "/api/v1/ic/revision" || pathOnly.endsWith("/api/v1/ic/revision")) &&
          res.statusCode >= 200 &&
          res.statusCode < 300)
      ) {
        return;
      }
      active.info(
        {
          durationMs,
          method: req.method,
          status: res.statusCode,
          url: req.originalUrl,
          ...getActiveTraceFields(),
        },
        `${req.method} ${req.originalUrl} ${res.statusCode}`,
      );
    });

    next();
  });
}
