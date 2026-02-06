// Middleware Configuration: Setup for global Express request/response processors.

import compression from "compression";
import cors from "cors";
import express, { type Application } from "express";
import helmet from "helmet";

import { apiLimiter } from "@/core/middleware/rate-limit.middleware";

export const configureMiddleware = (app: Application) => {
  // Body parsing: Strict limits are applied to prevent payload injection or memory exhaustion.
  app.use(express.json({ limit: "50kb" }));
  app.use(express.urlencoded({ extended: true, limit: "50kb" }));

  // Security headers: Helmet provides a baseline set of HTTP protection (e.g., XSS, Clickjacking).
  app.use(apiLimiter);
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disabled/simplified to allow Swagger UI scripts to run.
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Cross-Origin Resource Sharing: Restricted to the specific frontend URL for production security.
  app.use(
    cors({
      origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
      credentials: true, // Required for secure session cookie exchange.
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // Payload Compression: Reduces bandwidth usage for large JSON responses (e.g., product lists).
  app.use(
    compression({
      level: 6,
      threshold: 1024,
    }),
  );
};
