// Structured JSON logger (Pino). Pretty-print only in development; production → raw JSON on stdout.
// Request-scoped fields (requestId, userId, …) flow via AsyncLocalStorage so every logger.* call
// in a request automatically carries context without repeating it at each call site.

import { AsyncLocalStorage } from "node:async_hooks";

import pino, { type Logger } from "pino";

const isDev = process.env.NODE_ENV === "development";

const redactPaths = [
  "password",
  "Password",
  "slPassword",
  "token",
  "secret",
  "apiKey",
  "SESSION_SECRET",
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers.Cookie",
  "headers.authorization",
  "headers.cookie",
  "*.password",
  "*.Password",
  "*.slPassword",
  "*.token",
  "*.secret",
  "rawPayload.password",
  "rawPayload.Password",
  "body.password",
  "body.Password",
];

const rootLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: redactPaths,
    censor: "[REDACTED]",
  },
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:hh:mm:ss TT",
        ignore: "pid,hostname",
      },
    },
  }),
});

/** Active request logger (if any). Outside HTTP requests this is empty → root logger is used. */
export const loggerStorage = new AsyncLocalStorage<Logger>();

function createRequestAwareLogger(root: Logger): Logger {
  return new Proxy(root, {
    get(target, prop, _receiver) {
      const active = loggerStorage.getStore() ?? target;
      const value = Reflect.get(active, prop, active);
      if (typeof value === "function") {
        return value.bind(active);
      }
      return value;
    },
  }) as Logger;
}

/**
 * App logger. Inside a request, every call is delegated to the request child logger
 * (requestId / userId bound in middleware) without call sites needing req.log.
 */
export const logger = createRequestAwareLogger(rootLogger);

/** Run the rest of the request pipeline with `child` as the active logger. */
export function runWithRequestLogger<T>(child: Logger, callback: () => T): T {
  return loggerStorage.run(child, callback);
}

/**
 * Replace the active request logger (e.g. after binding userId).
 * Must be called while already inside runWithRequestLogger.
 */
export function bindRequestLogger(child: Logger): void {
  loggerStorage.enterWith(child);
}
