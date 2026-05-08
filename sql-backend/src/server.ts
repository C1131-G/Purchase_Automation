import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";
import { initializeDatabase } from "@/db/config/data-source";

import { createApp } from "./app";

const startServer = async () => {
  try {
    logger.info({ env: config.nodeEnv, msg: "Starting SQL Backend" });

    await initializeDatabase();
    logger.info({ msg: "Database initialized" });

    const app = createApp();

    const server = app.listen(config.server.port, () => {
      logger.info({
        frontend: config.server.frontendUrl,
        msg: "SQL Backend running",
        port: config.server.port,
      });
    });

    const shutdown = async (signal: string) => {
      logger.info({ msg: `${signal} received, shutting down gracefully` });

      server.close(() => {
        logger.info({ msg: "HTTP server closed" });
        process.exit(0);
      });

      setTimeout(() => {
        logger.error({ msg: "Forced shutdown after timeout" });
        process.exit(1);
      }, config.server.shutdownTimeout);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.fatal({
      error: error instanceof Error ? error.message : String(error),
      msg: "Failed to start server",
    });
    process.exit(1);
  }
};

startServer();
