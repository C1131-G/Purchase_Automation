// HANA Database Service: Low-level driver for SAP HANA connectivity. Manages a high-performance connection pool shared across all tenant-specific repositories.

import hanaClient from "@sap/hana-client";

import { config } from "@/config/env";
import { logger } from "@/core/logger/pino-logger";
import { recordDbOperation, registerPoolGauges } from "@/core/observability/metrics";
import { truncateSql } from "@/core/observability/attributes";
import { withSpan } from "@/core/observability/tracing";
import type { HanaConnection, HanaPool } from "@/services/types/hana.types";

// HANA Connection Pool Manager: Controls the lifecycle of database connections to minimize handshake latency.
class HanaConnectionPool {
  private pool: HanaPool | null = null;
  private isConnected: boolean = false;
  private connectedAt: number | null = null;

  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.connectedAt = null;
  }

  // Establishes the initial connection pool using system-level credentials defined in the environment.
  async initialize(): Promise<void> {
    if (this.isConnected) {
      logger.info("HANA pool already initialized");
      return;
    }

    const dbConfig = {
      password: config.hana.systemPassword,
      serverNode: `${config.hana.host}:${config.hana.port}`,
      user: config.hana.systemUser,
    };

    const poolOptions = {
      max_pool_size: config.hana.maxPoolSize,
      min_pool_size: 2,
      // Health check interval to prune dead connections.
      ping_interval: 60_000,
      // Hard limit on how long a connection can stay in the pool before being recycled.
      connection_lifetime: config.hana.connectionLifeTime,
    };

    try {
      // Create pool instead of single connection
      this.pool = hanaClient.createPool(dbConfig, poolOptions) as HanaPool;

      // Test the pool with a dummy connection
      await new Promise<void>((resolve, reject) => {
        if (!this.pool) {
          return reject(new Error("Pool not created"));
        }
        this.pool.getConnection((err, conn) => {
          if (err) {
            reject(err);
          } else {
            conn.disconnect(() => resolve());
          }
        });
      });

      this.isConnected = true;
      this.connectedAt = Date.now();

      registerPoolGauges(() => {
        const stats = this.getPoolStats();
        const available = stats.availableConnections;
        const size = stats.poolSize;
        return [
          {
            pool: "hana",
            idle: available,
            active: Math.max(0, size - available),
            waiting: 0,
          },
        ];
      });

      logger.info({
        database: config.hana.commonDb,
        maxSize: poolOptions.max_pool_size,
        msg: "HANA connection pool initialized",
        server: dbConfig.serverNode,
      });
    } catch (err: unknown) {
      const caughtError = err instanceof Error ? err : new Error(String(err));
      logger.error({
        err: caughtError,
        msg: "HANA pool initialization failed",
        server: `${config.hana.host}:${config.hana.port}`,
      });
      throw caughtError;
    }
  }

  // Executes a raw SQL query by borrowing a connection from the pool.
  async query(
    sql: string,
    params: unknown[] = [],
    timeout: number = 30_000,
  ): Promise<Record<string, unknown>[]> {
    if (!this.isConnected || !this.pool) {
      throw new Error("HANA connection pool not initialized");
    }

    const start = process.hrtime.bigint();
    return withSpan(
      "db.hana.query",
      {
        "db.system": "hana",
        "db.operation": "query",
        // Truncated statement only — never full params (PII / secrets risk).
        "db.statement": truncateSql(sql),
      },
      async () => {
        let connection: HanaConnection | null = null;
        let isSettled: boolean = false;

        try {
          // Acquire connection from pool. Returns to pool automatically on connection.disconnect().
          connection = await new Promise<HanaConnection>((resolve, reject) => {
            if (!this.pool) {
              return reject(new Error("Pool not initialized"));
            }
            this.pool.getConnection((err, conn) => {
              if (err) {
                reject(err);
              } else {
                resolve(conn);
              }
            });
          });

          // Execute query with a race condition to enforce application-level timeouts.
          return await Promise.race([
            new Promise<Record<string, unknown>[]>((resolve, reject) => {
              if (!connection) {
                return reject(new Error("Connection lost"));
              }
              connection.exec(sql, params, (err, rows) => {
                if (isSettled) {
                  return;
                }
                isSettled = true;
                if (err) {
                  reject(err);
                } else {
                  resolve(rows);
                }
              });
            }),
            new Promise<Record<string, unknown>[]>((_resolve, reject) =>
              setTimeout(() => {
                if (isSettled) {
                  return;
                }
                isSettled = true;
                reject(new Error("Query timeout exceeded"));
              }, timeout),
            ),
          ]);
        } finally {
          const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
          recordDbOperation("hana", "query", durationSec);
          // Return connection to pool. Essential to prevent pool exhaustion.
          if (connection) {
            try {
              connection.disconnect();
            } catch (err: unknown) {
              const caughtError = err instanceof Error ? err : new Error(String(err));
              logger.error({
                err: caughtError,
                msg: "Error returning connection to pool",
              });
            }
          }
        }
      },
    );
  }

  // Provides real-time metrics for monitoring the health of the HANA pool.
  getPoolStats() {
    return {
      availableConnections: this.pool?.getAvailableCount?.() || 0,
      isConnected: this.isConnected,
      poolSize: this.pool?.getPoolSize?.() || 0,
      uptime: this.isConnected && this.connectedAt ? Date.now() - this.connectedAt : 0,
    };
  }

  // Gracefully shuts down the connection pool, clearing all active sockets.
  async close(): Promise<void> {
    if (this.pool && this.isConnected) {
      try {
        this.pool.clear();
        this.isConnected = false;
        logger.info("HANA connection pool closed");
      } catch (err: unknown) {
        const caughtError = err instanceof Error ? err : new Error(String(err));
        logger.error({ err: caughtError, msg: "HANA pool close failed" });
      }
    }
  }
}

// Global singleton used by tenant-aware repositories to execute optimized SQL queries.
export const hanaPool = new HanaConnectionPool();
