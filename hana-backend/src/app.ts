// Express Application Configuration: This is the central assembly point for the HTTP server.
// It orchestrates security middleware, session management, route mounting, and global error handling.

import express from "express";
import type { NextFunction, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";

import { configureMiddleware } from "@/config/middleware";
import { configureSession } from "@/config/session";
import { generateOpenApiSpec } from "@/config/swagger";
import AppError from "@/core/errors/app-error";
import { errorHandler } from "@/core/errors/error-handler";
import { apiRoutes } from "@/routes/api.routes";
import { healthRoutes } from "@/routes/health.routes";

export const app = express();

// Security & Performance: Enable strong ETags to minimize bandwidth for unchanged resources.
app.set("etag", "strong");

// Core Middleware: Sets up Helmet for security headers, CORS, body parsers, and rate limiting.
configureMiddleware(app);

// Session Management: Configures secure cookie-based sessions for authentication persistence.
configureSession(app);

// Health Check: Public endpoint for uptime monitoring and load balancer heartbeats.
app.use("/api/v1/health", healthRoutes);

// Swagger Documentation: Generates and serves the OpenAPI specification for interactive API testing.
const swaggerSpec = generateOpenApiSpec();
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "Vendor Portal API Docs",
    swaggerOptions: {
      docExpansion: "list",
      filter: true,
      persistAuthorization: true,
    },
  }),
);

// API Routes: Mounts the main versioned router for all business logic endpoints.
app.use("/api/v1", apiRoutes);

// Default Handler (404): Catches any request that didn't match a defined route.
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(
    new AppError(
      `The requested resource '${req.originalUrl}' was not found on this server.`,
      404,
      "NOT_FOUND",
    ),
  );
});

// Global Error Handler: Final catch-all that logs exceptions and formats user-friendly responses.
app.use(errorHandler);
