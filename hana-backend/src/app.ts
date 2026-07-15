// Express application: middleware, docs, routes, error handling.

import express from "express";
import type { NextFunction, Request, Response } from "express";

import "@/types/express.types";
import { config } from "@/config/env";
import { configureMiddleware } from "@/config/middleware";
import { configureSession } from "@/config/session";
import { configureSwagger } from "@/config/swagger";
import AppError from "@/core/errors/app-error";
import { errorHandler } from "@/core/errors/error-handler";
import { createMetricsHandler } from "@/core/observability/prometheus";
import { apiRoutes } from "@/routes/api.routes";
import { healthRoutes } from "@/routes/health.routes";

export const app = express();

app.set("etag", "strong");

// Prometheus scrape (no session/auth unless bearer configured). Mount early.
if (config.observability.metricsEnabled) {
  app.get(
    config.observability.metricsPath,
    createMetricsHandler({
      path: config.observability.metricsPath,
      bearerToken: config.observability.metricsBearerToken,
    }),
  );
}

configureMiddleware(app);
configureSession(app);
configureSwagger(app);

// Health is also mounted at /api/v1/health for load balancers (same router).
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1", apiRoutes);

app.use((req: Request, _res: Response, next: NextFunction) => {
  next(
    new AppError(
      `The requested resource '${req.originalUrl}' was not found on this server.`,
      404,
      "NOT_FOUND",
    ),
  );
});

app.use(errorHandler);
