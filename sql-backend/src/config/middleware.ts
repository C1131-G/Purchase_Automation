import compression from "compression";
import cors from "cors";
import helmet from "helmet";

import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";

export const middleware = [
  helmet({
    contentSecurityPolicy: false,
  }),
  cors({
    credentials: true,
    origin: config.server.frontendUrl,
  }),
  compression(),
];

export const initMiddleware = () => {
  logger.info({
    cors: config.server.frontendUrl,
    msg: "Middleware configured",
  });
};
