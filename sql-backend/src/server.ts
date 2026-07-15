import "dotenv/config";

import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";
import { app } from "@/app";
import { initializeDatabase, closeDatabase } from "@/db/client";

async function start() {
  logger.info({ port: config.server.port }, "Starting SQL backend...");

  await initializeDatabase();

  const server = app.listen(config.server.port, () => {
    logger.info({ port: config.server.port }, "SQL backend listening");
    if (process.env.NODE_ENV !== "production") {
      logger.info({ url: `http://localhost:${config.server.port}/api-docs` }, "API docs (web)");
      logger.info({ url: `http://localhost:${config.server.port}/api-docs.json` }, "Postman collection (OpenAPI spec)");
    }
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutdown signal received");
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, config.server.shutdownTimeout);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception");
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason }, "Unhandled rejection");
    process.exit(1);
  });
}

start().catch((err) => {
  logger.fatal({ err }, "Failed to start SQL backend");
  process.exit(1);
});
