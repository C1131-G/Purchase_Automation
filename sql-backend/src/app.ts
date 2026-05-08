import express from "express";

import { initMiddleware, middleware } from "@/config/middleware";
import { initSession, sessionMiddleware } from "@/config/session";
import { initSwagger } from "@/config/swagger";
import { logger } from "@/core/logger/pino-logger";
import { apiRoutes } from "@/routes/api.routes";

export const createApp = () => {
  const app = express();

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  middleware.forEach((mw) => app.use(mw));
  app.use(sessionMiddleware);

  initSwagger(app);
  initSession();
  initMiddleware();

  app.use("/api/v1", apiRoutes);

  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error({
        error: err.message,
        msg: "Unhandled error",
        stack: err.stack,
      });
      res.status(500).json({
        message: "Internal server error",
        success: false,
      });
    },
  );

  return app;
};
