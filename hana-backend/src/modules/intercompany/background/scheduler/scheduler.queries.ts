import {
  getIcSqlClient,
  toNullableNumber,
  toNumber,
  toString,
  type IcSqlClient,
} from "@/modules/intercompany/infrastructure/ic-sql";

export type IcSchedulerJob = {
  jobId: number;
  jobName: string;
  companyId: number | null;
  lastRun: string | null;
  nextRun: string | null;
  status: string;
  lastError: string | null;
};

export const mapSchedulerRow = (row: Record<string, unknown>): IcSchedulerJob => ({
  companyId: toNullableNumber(row.COMPANY_ID ?? row.companyId),
  jobId: toNumber(row.JOB_ID ?? row.jobId),
  jobName: toString(row.JOB_NAME ?? row.jobName),
  lastError:
    row.LAST_ERROR === null || row.LAST_ERROR === undefined ? null : toString(row.LAST_ERROR),
  lastRun: row.LAST_RUN === null || row.LAST_RUN === undefined ? null : toString(row.LAST_RUN),
  nextRun: row.NEXT_RUN === null || row.NEXT_RUN === undefined ? null : toString(row.NEXT_RUN),
  status: toString(row.STATUS ?? row.status ?? "IDLE"),
});

export type SchedulerQueries = {
  findByName: (jobName: string) => Promise<IcSchedulerJob | null>;
};

export const createSchedulerQueries = (sql: IcSqlClient = getIcSqlClient()): SchedulerQueries => ({
  findByName: async (jobName) => {
    const rows = await sql.query(`SELECT * FROM "IC_SCHEDULER_JOB" WHERE "JOB_NAME" = ?`, [
      jobName,
    ]);
    return rows[0] ? mapSchedulerRow(rows[0]) : null;
  },
});

export const schedulerQueries = createSchedulerQueries();
