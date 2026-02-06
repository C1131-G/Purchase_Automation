// Session Configuration: Persistent login state management using secure, signed cookies.

import type { Application } from "express";
import session from "express-session";
import FileStore from "session-file-store";

import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";

export const configureSession = (app: Application) => {
  // Scalability Check: FileStore writes sessions to the local disk.
  // In a multi-server/container production cluster, this must be replaced with Redis.
  if (config.nodeEnv === "production") {
    logger.warn("Using FileStore for sessions in PRODUCTION. This prevents horizontal scaling.");
  }

  const SessionFileStore = FileStore(session);

  app.use(
    session({
      store: new SessionFileStore({
        path: "./sessions",
        ttl: 30 * 60, // 30 minutes of inactivity before session is purged.
        retries: 0,
      }),
      secret: config.session.secret,
      resave: false, // Prevents unnecessary disk I/O on unchanged sessions.
      saveUninitialized: false, // Compliance: Don't create sessions until a user actually logs in.
      rolling: true, // Renews the session cookie on every request to prevent timeout during active use.
      cookie: {
        secure: config.nodeEnv === "production", // Requires HTTPS in production.
        httpOnly: true, // Prevents XSS-based session hijacking.
        sameSite: "lax", // Balance between security and usability for typical navigation.
      },
      name: "vendorportal.sid",
    }),
  );
};
