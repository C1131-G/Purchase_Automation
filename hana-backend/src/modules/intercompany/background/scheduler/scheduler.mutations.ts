import { getIcSqlClient, type IcSqlClient } from "@/modules/intercompany/infrastructure/ic-sql";

import { createSchedulerQueries, type IcSchedulerJob } from "./scheduler.queries";

export type MarkJobRunInput = {
  jobName: string;
  status: "RUNNING" | "IDLE" | "ERROR";
  lastError?: string | null;
  nextRun?: Date | string | null;
  companyId?: number | null;
};

export type SchedulerMutations = {
  ensureJob: (jobName: string, companyId?: number | null) => Promise<IcSchedulerJob>;
  markRun: (input: MarkJobRunInput) => Promise<IcSchedulerJob | null>;
};

export const createSchedulerMutations = (
  sql: IcSqlClient = getIcSqlClient(),
): SchedulerMutations => {
  const queries = createSchedulerQueries(sql);

  const ensureJob = async (
    jobName: string,
    companyId: number | null = null,
  ): Promise<IcSchedulerJob> => {
    const existing = await queries.findByName(jobName);
    if (existing) {
      return existing;
    }
    await sql.query(
      `INSERT INTO "IC_SCHEDULER_JOB" ("JOB_NAME","COMPANY_ID","STATUS")
       VALUES (?,?,?)`,
      [jobName, companyId, "IDLE"],
    );
    const created = await queries.findByName(jobName);
    if (created) {
      return created;
    }
    return {
      companyId,
      jobId: 0,
      jobName,
      lastError: null,
      lastRun: null,
      nextRun: null,
      status: "IDLE",
    };
  };

  return {
    ensureJob,

    markRun: async (input) => {
      await ensureJob(input.jobName, input.companyId ?? null);
      const nextRun =
        input.nextRun === undefined || input.nextRun === null
          ? null
          : input.nextRun instanceof Date
            ? input.nextRun.toISOString()
            : String(input.nextRun);

      await sql.query(
        `UPDATE "IC_SCHEDULER_JOB"
            SET "LAST_RUN" = CURRENT_TIMESTAMP,
                "NEXT_RUN" = ?,
                "STATUS" = ?,
                "LAST_ERROR" = ?
          WHERE "JOB_NAME" = ?`,
        [nextRun, input.status, input.lastError ?? null, input.jobName],
      );

      return queries.findByName(input.jobName);
    },
  };
};

export type SchedulerService = SchedulerMutations;

export const createSchedulerService = (sql: IcSqlClient = getIcSqlClient()): SchedulerService =>
  createSchedulerMutations(sql);

export const schedulerService = createSchedulerService();
