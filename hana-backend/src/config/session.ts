// Session Configuration: Persistent login state management using secure, signed cookies.

import nodeFs from "node:fs";
import path from "node:path";

import type { Application } from "express";
import session from "express-session";

import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";

class AtomicFileStore extends session.Store {
  private sessions = new Map<string, string>();
  private lastAccess = new Map<string, number>();
  private sessionPath: string;
  private ttl: number;
  private reapInterval: NodeJS.Timeout | null = null;

  constructor(options: { path: string; ttl?: number }) {
    super();
    this.sessionPath = options.path;
    this.ttl = options.ttl || 60 * 60 * 24 * 30; // 30 days default

    this.clearSessionsFromDisk();
    this.startReapTimer();
  }

  private clearSessionsFromDisk(): void {
    try {
      if (!nodeFs.existsSync(this.sessionPath)) {
        nodeFs.mkdirSync(this.sessionPath, { recursive: true });
        return;
      }
      const files = nodeFs.readdirSync(this.sessionPath);
      let clearedCount = 0;
      for (const file of files) {
        const filePath = path.join(this.sessionPath, file);
        if (file.endsWith(".tmp") || file.endsWith(".json")) {
          try {
            nodeFs.unlinkSync(filePath);
            clearedCount += 1;
          } catch {}
        }
      }
      logger.info({
        event: "stale_sessions_cleared",
        count: clearedCount,
        msg: "Cleared persisted sessions on startup",
      });
    } catch (err) {
      logger.error({
        event: "stale_sessions_clear_failed",
        err: err as Error,
      });
    }
  }

  private startReapTimer(): void {
    this.reapInterval = setInterval(
      () => {
        const now = Date.now();
        for (const [sid, content] of this.sessions.entries()) {
          try {
            const sess = JSON.parse(content);
            const expires = sess.cookie?.expires ? new Date(sess.cookie.expires) : null;
            const lastTouch = this.lastAccess.get(sid) || now;

            if (expires) {
              if (expires.getTime() < now) {
                this.destroy(sid);
                logger.info({ event: "session_reaped", sid, reason: "cookie_expired" });
              }
            } else if (now - lastTouch > this.ttl * 1000) {
              this.destroy(sid);
              logger.info({ event: "session_reaped", sid, reason: "ttl_timeout" });
            }
          } catch {
            this.destroy(sid);
          }
        }
      },
      1000 * 60 * 10,
    ); // Every 10 minutes

    if (this.reapInterval && typeof this.reapInterval.unref === "function") {
      this.reapInterval.unref();
    }
  }

  get(sid: string, callback: (err: any, session?: session.SessionData | null) => void): void {
    const data = this.sessions.get(sid);
    if (!data) {
      return callback(null, null);
    }
    try {
      const sess = JSON.parse(data);
      callback(null, sess);
    } catch (err) {
      logger.error({
        event: "session_parse_failed",
        sid,
        err: err as Error,
      });
      this.sessions.delete(sid);
      this.lastAccess.delete(sid);
      callback(null, null);
    }
  }

  set(sid: string, sess: session.SessionData, callback?: (err?: any) => void): void {
    try {
      const content = JSON.stringify(sess);
      this.sessions.set(sid, content);
      this.lastAccess.set(sid, Date.now());

      const targetPath = path.join(this.sessionPath, `${sid}.json`);

      nodeFs.writeFile(targetPath, content, "utf8", (err) => {
        if (err) {
          logger.error({
            event: "session_write_failed",
            sid,
            err,
          });
          if (callback) callback(err);
          return;
        }
        if (callback) callback(null);
      });
    } catch (err) {
      logger.error({
        event: "session_stringify_failed",
        sid,
        err: err as Error,
      });
      if (callback) callback(err);
    }
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    this.sessions.delete(sid);
    this.lastAccess.delete(sid);
    const filePath = path.join(this.sessionPath, `${sid}.json`);
    nodeFs.unlink(filePath, (err) => {
      if (err && (err as NodeJS.ErrnoException).code !== "ENOENT") {
        logger.error({
          event: "session_delete_failed",
          sid,
          err,
        });
        if (callback) callback(err);
        return;
      }
      if (callback) callback(null);
    });
  }

  touch(sid: string, sess: session.SessionData, callback?: (err?: any) => void): void {
    this.set(sid, sess, callback);
  }
}

export const configureSession = (app: Application) => {
  const sessionPath = path.resolve(process.cwd(), "sessions");
  if (!nodeFs.existsSync(sessionPath)) {
    nodeFs.mkdirSync(sessionPath, { recursive: true });
  }

  const store = new AtomicFileStore({
    path: sessionPath,
    ttl: 60 * 60 * 24 * 30, // 30 days
  });

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
