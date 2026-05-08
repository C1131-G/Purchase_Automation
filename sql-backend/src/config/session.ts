import session from "express-session";
import FileStore from "session-file-store";

import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";

const FileStoreSession = FileStore(session);

export const sessionMiddleware = session({
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: config.nodeEnv === "production",
  },
  name: "vendorportal.sid",
  resave: false,
  rolling: true,
  saveUninitialized: false,
  secret: config.session.secret,
  store: new FileStoreSession({
    path: "./sql-backend/sessions",
    retries: 2,
    retryInterval: 10,
  }),
});

export const initSession = () => {
  logger.info({ msg: "Session middleware configured", ttl: "30 days" });
};
