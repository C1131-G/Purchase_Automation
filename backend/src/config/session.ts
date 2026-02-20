// Session Configuration: Persistent login state management using secure, signed cookies.

import fs from "node:fs";
import path from "node:path";

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
  const sessionPath = path.resolve(process.cwd(), "sessions");
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const store = new SessionFileStore({
    path: sessionPath,
    // Keep server-side session records longer to prevent unintended auto-expiry
    // during active business usage. Session still ends on explicit logout.
    ttl: 60 * 60 * 24 * 30, // 30 days
    retries: 0,
  });

  const originalGet = store.get.bind(store);
  store.get = (sid, callback) => {
    originalGet(sid, (error, sess) => {
      if ((error as NodeJS.ErrnoException | null)?.code === "ENOENT") {
        logger.warn({
          event: "session_file_missing",
          sid,
          reason: "session_file_deleted_or_expired",
        });
        callback(null, null);
        return;
      }
      callback(error, sess);
    });
  };

  app.use(
    session({
      store,
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
