import pino from "pino";

import { config } from "@/config/env";

export const logger = pino({
  level: config.nodeEnv === "development" ? "debug" : "info",
  transport:
    config.nodeEnv === "development"
      ? {
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "HH:MM:ss",
          },
          target: "pino-pretty",
        }
      : undefined,
});
