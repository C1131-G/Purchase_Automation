// Server Entry Point: Bootstraps the entire application stack.
// It handles initialization of the HANA pool, TypeORM data sources, SAP Service Layer clients, and the HTTP server itself.

import "dotenv/config";
import "@/config/zod"; // Global Zod error configuration.

import { readFile } from "node:fs/promises";

import { app } from "@/app";
import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";
import { AppDataSource, initializeDatabase } from "@/db/config/data-source";
import { closeAllTenantDataSources } from "@/db/config/tenant-data-source";
import { hanaPool } from "@/services/hana.service";
import { serviceLayerClient } from "@/services/service-layer.service";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf-8"),
);

const PORT = config.server.port || 4000;
const SHUTDOWN_TIMEOUT = config.server.shutdownTimeout || 10000;

const start = async () => {
  try {
    logger.info(`Starting ${packageJson.name} v${packageJson.version}...`);

    // SAP Integration initialization sequence.
    await hanaPool.initialize();
    await initializeDatabase(); // Center-of-truth registry initialization.
    serviceLayerClient.initialize(
      config.serviceLayer.serviceLayerURL,
      config.serviceLayer.httpsVerify,
    );

    // HTTP Server initialization.
    const server = app.listen(PORT, () => {
      logger.info({
        msg: "Server started successfully",
        port: PORT,
        env: process.env.NODE_ENV || "development",
        url: `http://localhost:${PORT}`,
        swagger: `http://localhost:${PORT}/api-docs`,
      });
    });

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        logger.fatal({ msg: "Port already in use", port: PORT });
        process.exit(1);
      }
      logger.error({ msg: "HTTP server error", error: error.message });
    });

    // Graceful Shutdown Logic: Ensures that active database connections and SAP sessions are terminated cleanly.
    const shutdown = async (signal: string) => {
      logger.info({ msg: "Graceful shutdown initiated", signal });
      server.close(() => logger.info("HTTP server stopped"));

      // Safety: Force exit if cleanup takes longer than the configured timeout.
      const forceShutdownTimeout = setTimeout(() => {
        logger.error("Shutdown timed out, forcing exit");
        process.exit(1);
      }, SHUTDOWN_TIMEOUT);

      try {
        await hanaPool.close();
        await closeAllTenantDataSources();
        if (AppDataSource.isInitialized) {
          await AppDataSource.destroy();
        }
        clearTimeout(forceShutdownTimeout);
        logger.info("Server shutdown completed cleanly");
        process.exit(0);
      } catch (error) {
        logger.error({ msg: "Error during shutdown", error: (error as Error).message });
        process.exit(1);
      }
    };

    // OS Signalling for clean exits.
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Critical Error Management: Non-catchable errors resulting in process termination.
    process.on("uncaughtException", (err) => {
      logger.fatal({ msg: "UNCAUGHT EXCEPTION", error: err.message, stack: err.stack });
      process.exit(1);
    });

    process.on("unhandledRejection", (reason) => {
      logger.fatal({ msg: "UNHANDLED REJECTION", reason: String(reason) });
      process.exit(1);
    });
  } catch (error) {
    logger.fatal({
      msg: "Critical failure during server startup",
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    process.exit(1);
  }
};

start();
