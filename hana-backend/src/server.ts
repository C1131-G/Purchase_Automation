// Server Entry Point: Bootstraps the entire application stack.
// It handles initialization of the HANA pool, TypeORM data sources, SAP Service Layer clients, and the HTTP server itself.

import "dotenv/config";
import "@/config/zod"; // Global Zod error configuration.
import { readFile } from "node:fs/promises";

import { app } from "@/app";
import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";
import { stopObservability } from "@/core/observability/observability-runtime";
import { AppDataSource, initializeDatabase } from "@/db/config/data-source";
import { closeAllTenantDataSources } from "@/db/config/tenant-data-source";
import { hanaPool } from "@/services/hana.service";
import { serviceLayerClient } from "@/services/service-layer.service";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf-8"),
);

const PORT = config.server.port || 4000;
const SHUTDOWN_TIMEOUT = config.server.shutdownTimeout || 10_000;

const start = async () => {
  try {
    logger.info(`Starting ${packageJson.name} v${packageJson.version}...`);

    // SAP Integration: HANA pool and TypeORM can handshake in parallel.
    const sapStartedAt = Date.now();
    await Promise.all([hanaPool.initialize(), initializeDatabase()]);
    serviceLayerClient.initialize(
      config.serviceLayer.serviceLayerURL,
      config.serviceLayer.httpsVerify,
    );
    logger.info({ durationMs: Date.now() - sapStartedAt }, "SAP connections ready");

    // HTTP Server initialization.
    const server = app.listen(PORT, () => {
      logger.info(
        { env: process.env.NODE_ENV || "development", port: PORT, url: `http://localhost:${PORT}` },
        "Server started successfully",
      );
      // Rule 13: only log interactive docs / Postman import links outside production.
      if (process.env.NODE_ENV !== "production") {
        logger.info({ url: `http://localhost:${PORT}/api-docs` }, "API docs (web)");
        logger.info(
          { url: `http://localhost:${PORT}/api-docs.json` },
          "Postman collection (OpenAPI spec)",
        );
        if (config.observability.metricsEnabled) {
          logger.info(
            { url: `http://localhost:${PORT}${config.observability.metricsPath}` },
            "Prometheus metrics",
          );
        }
      }
    });

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        logger.fatal({ msg: "Port already in use", port: PORT });
        process.exit(1);
      }
      logger.error({ err: error, msg: "HTTP server error" });
    });

    // Graceful Shutdown Logic: Ensures that active database connections and SAP sessions are terminated cleanly.
    const shutdown = async (signal: string) => {
      logger.info({ msg: "Graceful shutdown initiated", signal });
      server.close(() => logger.info("HTTP server stopped"));

      // Safety: Force exit if cleanup takes longer than the configured timeout.
      const forceShutdownTimeout = setTimeout(() => {
        logger.error({ timeoutMs: SHUTDOWN_TIMEOUT }, "Shutdown timed out, forcing exit");
        process.exit(1);
      }, SHUTDOWN_TIMEOUT);

      try {
        await hanaPool.close();
        await closeAllTenantDataSources();
        if (AppDataSource.isInitialized) {
          await AppDataSource.destroy();
        }
        await stopObservability();
        clearTimeout(forceShutdownTimeout);
        logger.info("Server shutdown completed cleanly");
        process.exit(0);
      } catch (error) {
        logger.error({
          err: error instanceof Error ? error : new Error(String(error)),
          msg: "Error during shutdown",
        });
        process.exit(1);
      }
    };

    // OS Signalling for clean exits.
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Native / sync crashes can leave the process unsafe — exit so the supervisor restarts.
    process.on("uncaughtException", (err) => {
      logger.fatal({
        err: err,
        msg: "UNCAUGHT EXCEPTION",
        stack: err.stack,
      });
      process.exit(1);
    });

    // IC background work (setImmediate hooks, HANA lookups) can reject after the
    // HTTP response. Do not kill the API — that looks like a server.ts restart
    // every time an IC page or notification poll hits a transient error.
    process.on("unhandledRejection", (reason) => {
      logger.error({
        err: reason instanceof Error ? reason : new Error(String(reason)),
        msg: "UNHANDLED REJECTION (server stays up)",
      });
    });
  } catch (error) {
    logger.fatal({
      err: error instanceof Error ? error : new Error(String(error)),
      msg: "Critical failure during server startup",
      stack: (error as Error).stack,
    });
    process.exit(1);
  }
};

start();
