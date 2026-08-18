/**
 * IC background worker process entry.
 *
 * Run:
 *   pnpm --filter hana-backend worker:ic
 *   pnpm --filter hana-backend worker:ic -- --once
 *
 * Env:
 *   IC_WORKER_ONCE=1           — single loop then exit (smoke)
 *   IC_WORKER_INTERVAL_MS=60000 — loop interval when not --once
 */

import "dotenv/config";
import "@/config/zod";

import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";
import { stopObservability } from "@/core/observability/observability-runtime";
import { AppDataSource, initializeDatabase } from "@/db/config/data-source";
import { closeAllTenantDataSources } from "@/db/config/tenant-data-source";
import {
  createIcWorkerContext,
  runWorkerLoop,
} from "@/modules/intercompany/background/worker.context";
import { hanaPool } from "@/services/hana.service";
import { serviceLayerClient } from "@/services/service-layer.service";

const SHUTDOWN_TIMEOUT = config.server.shutdownTimeout || 10_000;

const parseOnce = (): boolean => {
  if (process.env.IC_WORKER_ONCE === "1" || process.env.IC_WORKER_ONCE === "true") {
    return true;
  }
  return process.argv.includes("--once");
};

const parseIntervalMs = (): number => {
  const raw = Number(process.env.IC_WORKER_INTERVAL_MS ?? 60_000);
  if (!Number.isFinite(raw) || raw < 5_000) {
    return 60_000;
  }
  return Math.trunc(raw);
};

const closeResources = async (): Promise<void> => {
  try {
    await hanaPool.close();
  } catch (err: unknown) {
    logger.warn({
      err: err instanceof Error ? err : new Error(String(err)),
      msg: "IC worker hanaPool.close failed",
    });
  }
  try {
    await closeAllTenantDataSources();
  } catch {
    // ignore
  }
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  } catch {
    // ignore
  }
  try {
    await stopObservability();
  } catch {
    // ignore
  }
};

const start = async (): Promise<void> => {
  const once = parseOnce();
  const intervalMs = parseIntervalMs();

  logger.info({
    intervalMs,
    msg: "Starting IC background worker",
    once,
    scope: "ic.worker",
  });

  await hanaPool.initialize();
  await initializeDatabase();
  serviceLayerClient.initialize(
    config.serviceLayer.serviceLayerURL,
    config.serviceLayer.httpsVerify,
  );

  const ctx = createIcWorkerContext();
  let stopping = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const shutdown = async (signal: string) => {
    if (stopping) {
      return;
    }
    stopping = true;
    logger.info({ msg: "IC worker shutdown", scope: "ic.worker", signal });
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    const force = setTimeout(() => {
      logger.error({ timeoutMs: SHUTDOWN_TIMEOUT }, "IC worker shutdown timed out");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);
    try {
      await closeResources();
      clearTimeout(force);
      process.exit(0);
    } catch (err: unknown) {
      clearTimeout(force);
      logger.error({
        err: err instanceof Error ? err : new Error(String(err)),
        msg: "IC worker shutdown error",
      });
      process.exit(1);
    }
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  const tick = async () => {
    if (stopping) {
      return;
    }
    try {
      const result = await runWorkerLoop(ctx);
      logger.info({
        detect: result.detect,
        msg: "IC worker loop complete",
        retry: result.retry,
        scope: "ic.worker",
        session: result.session,
      });
    } catch (err: unknown) {
      logger.error({
        err: err instanceof Error ? err : new Error(String(err)),
        msg: "IC worker loop failed",
        scope: "ic.worker",
      });
    }
  };

  if (once) {
    await tick();
    await closeResources();
    logger.info({ msg: "IC worker --once complete", scope: "ic.worker" });
    process.exit(0);
  }

  await tick();
  timer = setInterval(() => {
    void tick();
  }, intervalMs);
};

const isMain =
  typeof process.argv[1] === "string" &&
  (process.argv[1].includes("worker.entry") || process.argv[1].includes("worker-ic"));

if (isMain) {
  start().catch((err: unknown) => {
    logger.fatal({
      err: err instanceof Error ? err : new Error(String(err)),
      msg: "IC worker failed to start",
      scope: "ic.worker",
    });
    process.exit(1);
  });
}
