import nodeFs from "node:fs";
import path from "node:path";

import type { Application, RequestHandler } from "express";
import session from "express-session";

import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";

class AtomicFileStore extends session.Store {
  private sessions = new Map<string, string>();
  private lastAccess = new Map<string, number>();
  private sessionPath: string;
  private ttl: number;

  constructor(options: { path: string; ttl?: number }) {
    super();
    this.sessionPath = options.path;
    this.ttl = options.ttl || 60 * 60 * 24 * 30;

    this.loadSessionsFromDisk();
    this.startReapTimer();
  }

  private loadSessionsFromDisk(): void {
    try {
      if (!nodeFs.existsSync(this.sessionPath)) {
        nodeFs.mkdirSync(this.sessionPath, { recursive: true });
        return;
      }
      const files = nodeFs.readdirSync(this.sessionPath);
      for (const file of files) {
        const filePath = path.join(this.sessionPath, file);
        if (file.endsWith(".tmp")) {
          try {
            nodeFs.unlinkSync(filePath);
          } catch {
            /* ignore */
          }
          continue;
        }
        if (file.endsWith(".json")) {
          const sid = file.slice(0, -5);
          try {
            const stat = nodeFs.statSync(filePath);
            const content = nodeFs.readFileSync(filePath, "utf8");
            if (content && !content.includes("\u0000")) {
              JSON.parse(content);
              this.sessions.set(sid, content);
              this.lastAccess.set(sid, stat.mtimeMs);
            } else {
              nodeFs.unlinkSync(filePath);
            }
          } catch {
            try {
              nodeFs.unlinkSync(filePath);
            } catch {
              /* ignore */
            }
          }
        }
      }
      logger.info({ count: this.sessions.size }, "Loaded sessions from disk");
    } catch (err) {
      logger.error(
        { err: err instanceof Error ? err : new Error(String(err)) },
        "Failed to load sessions",
      );
    }
  }

  private startReapTimer(): void {
    const interval = setInterval(
      () => {
        const now = Date.now();
        for (const [sid, content] of this.sessions.entries()) {
          try {
            const sess = JSON.parse(content);
            const expires = sess.cookie?.expires ? new Date(sess.cookie.expires) : null;
            const lastTouch = this.lastAccess.get(sid) || now;

            if (expires) {
              if (expires.getTime() < now) this.destroy(sid);
            } else if (now - lastTouch > this.ttl * 1000) {
              this.destroy(sid);
            }
          } catch {
            this.destroy(sid);
          }
        }
      },
      1000 * 60 * 10,
    );

    if (typeof interval.unref === "function") interval.unref();
  }

  get(sid: string, callback: (err: any, session?: session.SessionData | null) => void): void {
    const data = this.sessions.get(sid);
    if (!data) return callback(null, null);
    try {
      callback(null, JSON.parse(data));
    } catch {
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
        if (callback) callback(err);
      });
    } catch (err) {
      if (callback) callback(err);
    }
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    this.sessions.delete(sid);
    this.lastAccess.delete(sid);
    const filePath = path.join(this.sessionPath, `${sid}.json`);
    nodeFs.unlink(filePath, (err) => {
      if (callback) callback(err && (err as NodeJS.ErrnoException).code !== "ENOENT" ? err : null);
    });
  }

  touch(sid: string, sess: session.SessionData, callback?: (err?: any) => void): void {
    this.set(sid, sess, callback);
  }
}

export function configureSession(app: Application) {
  const sessionPath = path.resolve(process.cwd(), "sessions");
  if (!nodeFs.existsSync(sessionPath)) {
    nodeFs.mkdirSync(sessionPath, { recursive: true });
  }

  const store = new AtomicFileStore({
    path: sessionPath,
    ttl: 60 * 60 * 24 * 30,
  });

  app.use(
    "/",
    session({
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.server.nodeEnv === "production",
      },
      name: "vendorportal.sid",
      resave: false,
      rolling: true,
      saveUninitialized: false,
      secret: config.session.secret,
      store,
    }) as unknown as RequestHandler,
  );
}
