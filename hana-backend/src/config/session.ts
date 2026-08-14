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

    this.loadSessionsFromDisk();
    this.startReapTimer();
  }

  private loadSessionsFromDisk(): void {
    const result = loadSessionFilesFromDisk(this.sessionPath);
    for (const record of result.loaded) {
      this.sessions.set(record.sid, record.content);
      this.lastAccess.set(record.sid, Date.now());
    }
    logger.info({
      event: "sessions_loaded",
      count: result.loaded.length,
      skippedExpired: result.skippedExpired,
      removedCorrupt: result.removedCorrupt,
      msg: "Loaded persisted portal sessions on startup",
    });
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

export type LoadedSessionFile = { sid: string; content: string };

export function loadSessionFilesFromDisk(sessionPath: string): {
  loaded: LoadedSessionFile[];
  skippedExpired: number;
  removedCorrupt: number;
} {
  const loaded: LoadedSessionFile[] = [];
  let skippedExpired = 0;
  let removedCorrupt = 0;

  if (!nodeFs.existsSync(sessionPath)) {
    nodeFs.mkdirSync(sessionPath, { recursive: true });
    return { loaded, skippedExpired, removedCorrupt };
  }

  const now = Date.now();
  for (const file of nodeFs.readdirSync(sessionPath)) {
    const filePath = path.join(sessionPath, file);
    if (file.endsWith(".tmp")) {
      try {
        nodeFs.unlinkSync(filePath);
      } catch {
        // ignore leftover temp files
      }
      continue;
    }
    if (!file.endsWith(".json")) {
      continue;
    }

    try {
      const content = nodeFs.readFileSync(filePath, "utf8");
      const sess = JSON.parse(content) as { cookie?: { expires?: string } };
      const expires = sess.cookie?.expires ? new Date(sess.cookie.expires).getTime() : null;
      if (expires !== null && Number.isFinite(expires) && expires < now) {
        nodeFs.unlinkSync(filePath);
        skippedExpired += 1;
        continue;
      }
      loaded.push({ content, sid: file.slice(0, -".json".length) });
    } catch {
      try {
        nodeFs.unlinkSync(filePath);
      } catch {
        // ignore
      }
      removedCorrupt += 1;
    }
  }

  return { loaded, skippedExpired, removedCorrupt };
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
