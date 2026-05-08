// Middleware Configuration: Setup for global Express request/response processors.

import compression from "compression";
import cors from "cors";
import express from "express";
import type { Application } from "express";
import helmet from "helmet";

import { config } from "@/config/env";

export const configureMiddleware = (app: Application) => {
  // Respect upstream reverse proxy (LB/Ingress) for correct client IP extraction.
  app.set("trust proxy", config.server.trustProxyHops);

  // Body parsing: Strict limits are applied to prevent payload injection or memory exhaustion.
  app.use(express.json({ limit: "50kb" }));
  app.use(express.urlencoded({ extended: true, limit: "50kb" }));

  // Security headers: Helmet provides a baseline set of HTTP protection (e.g., XSS, Clickjacking).
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disabled/simplified to allow Swagger UI scripts to run.
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Cross-Origin Resource Sharing: Restricted to the specific frontend URL for production security.
  app.use(
    cors({
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true, // Required for secure session cookie exchange.
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
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
