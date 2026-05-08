// Session Configuration: Persistent login state management using secure, signed cookies.

import fs from "node:fs";
import path from "node:path";

import type { Application } from "express";
import session from "express-session";
import FileStore from "session-file-store";

import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";

export const configureSession = (app: Application) => {
  // FileStore writes sessions to local disk and is not cluster-safe.
  if (config.nodeEnv === "production") {
    logger.warn("Using FileStore for sessions in PRODUCTION.");
  }

  const SessionFileStore = FileStore(session);
  const sessionPath = path.resolve(process.cwd(), "sessions");
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const store = new SessionFileStore({
    path: sessionPath,
    retries: 0,
    ttl: 60 * 60 * 24 * 30,
  });

  const originalGet = store.get.bind(store);
  store.get = (sid, callback) => {
    originalGet(sid, (error, sess) => {
      if ((error as NodeJS.ErrnoException | null)?.code === "ENOENT") {
        logger.warn({
          event: "session_file_missing",
          reason: "session_file_deleted_or_expired",
          sid,
        });
        callback(null, null);
        return;
      }
      callback(error, sess);
    });
  };

  if (typeof store.touch === "function") {
    const originalTouch = store.touch.bind(store);
    store.touch = (sid: string, sess: session.Session, callback?: (err?: unknown) => void) => {
      originalTouch(sid, sess, (error?: unknown) => {
        if ((error as NodeJS.ErrnoException | null)?.code === "ENOENT") {
          logger.warn({
            event: "session_file_missing_on_touch",
            reason: "session_file_deleted_or_expired",
            sid,
          });
          if (typeof callback === "function") {
            callback(null);
          }
          return;
        }
        if (typeof callback === "function") {
          callback(error ?? null);
        }
      });
    };
  }

  app.use(
    session({
      cookie: {
        httpOnly: true, // Prevents XSS-based session hijacking.
        sameSite: "lax", // Balance between security and usability for typical navigation.
        secure: config.nodeEnv === "production", // Requires HTTPS in production.
      },
      name: "vendorportal.sid",
      resave: false, // Prevents unnecessary disk I/O on unchanged sessions.
      rolling: true, // Renews the session cookie on every request to prevent timeout during active use.
      saveUninitialized: false, // Compliance: Don't create sessions until a user actually logs in.
      secret: config.session.secret,
      store,
    }),
  );
};
