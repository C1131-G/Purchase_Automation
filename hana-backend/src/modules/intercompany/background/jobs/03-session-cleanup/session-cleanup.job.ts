import { logger } from "@/core/logger/pino-logger";
import {
  createSchedulerService,
  type SchedulerService,
} from "@/modules/intercompany/background/scheduler/scheduler.mutations";
import { IC_JOB_NAME } from "@/modules/intercompany/infrastructure/constants";
import { getIcSqlClient, type IcSqlClient } from "@/modules/intercompany/infrastructure/ic-sql";

export type SessionCleanupResult = {
  removed: number;
};

export type SessionCleanupJob = {
  run: () => Promise<SessionCleanupResult>;
};

/**
 * Expire hygiene: delete IC_SL_SESSION rows whose EXPIRY_TIME is in the past.
 */
export const createSessionCleanupJob = (deps?: {
  sql?: IcSqlClient;
  scheduler?: SchedulerService;
}): SessionCleanupJob => {
  const sql = deps?.sql ?? getIcSqlClient();
  const scheduler = deps?.scheduler ?? createSchedulerService(sql);

  return {
    run: async () => {
      await scheduler.ensureJob(IC_JOB_NAME.SESSION_CLEANUP);
      await scheduler.markRun({
        jobName: IC_JOB_NAME.SESSION_CLEANUP,
        status: "RUNNING",
      });

      try {
        const expired = await sql.query(
          `SELECT "SESSION_ID" FROM "IC_SL_SESSION" WHERE "EXPIRY_TIME" <= CURRENT_TIMESTAMP`,
        );
        if (expired.length > 0) {
          await sql.query(`DELETE FROM "IC_SL_SESSION" WHERE "EXPIRY_TIME" <= CURRENT_TIMESTAMP`);
        }

        const result: SessionCleanupResult = { removed: expired.length };
        await scheduler.markRun({
          jobName: IC_JOB_NAME.SESSION_CLEANUP,
          lastError: null,
          status: "IDLE",
        });

        logger.info({
          msg: "IC session cleanup complete",
          removed: result.removed,
          scope: "ic.job.session_cleanup",
        });
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        await scheduler.markRun({
          jobName: IC_JOB_NAME.SESSION_CLEANUP,
          lastError: message.slice(0, 2000),
          status: "ERROR",
        });
        throw err instanceof Error ? err : new Error(message);
      }
    },
  };
};

export const sessionCleanupJob = createSessionCleanupJob();
