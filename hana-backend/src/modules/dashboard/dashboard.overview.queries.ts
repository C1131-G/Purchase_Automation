// Compatibility overview: compose independently cached dashboard sections in parallel.

import { logger } from "@/core/logger/pino-logger";
import { getCachedData } from "@/core/utils/cache";
import {
  getOverviewRelationships,
  type OverviewConnectedPartner,
} from "./dashboard.relationships.queries";
import { getOverviewWork, type OverviewKpiMetric } from "./dashboard.work.queries";
import type { OverviewArApprovalItem } from "./dashboard.ar-approval.queries";
import type { OverviewStatement } from "./dashboard.statement.queries";

export type {
  OverviewArApprovalItem,
  OverviewConnectedPartner,
  OverviewKpiMetric,
  OverviewStatement,
};

export type OverviewDashboard = {
  currency: string;
  asOf: string;
  sessionCompanyId: number | null;
  kpis: {
    openPq: OverviewKpiMetric;
    openSq: OverviewKpiMetric;
    openPo: OverviewKpiMetric;
    arApprovalPending: { count: number; openValue: number };
  };
  connectedPartners: OverviewConnectedPartner[];
  arApprovalPending: OverviewArApprovalItem[];
  statement: OverviewStatement;
};

export const OVERVIEW_CACHE_TTL_MS = 60_000;

export const getOverviewDashboard = async (dbName: string): Promise<OverviewDashboard> =>
  getCachedData(
    `dashboard:overview:${dbName}`,
    async () => {
      const startedAt = process.hrtime.bigint();
      const [work, relationships] = await Promise.all([
        getOverviewWork(dbName),
        getOverviewRelationships(dbName),
      ]);
      logger.info({
        db: dbName,
        durationMs: Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6),
        partnerCount: relationships.connectedPartners.length,
        openArCount: work.kpis.arApprovalPending.count,
        msg: "Overview dashboard built from parallel sections",
      });
      return {
        ...work,
        asOf: relationships.asOf,
        sessionCompanyId: relationships.sessionCompanyId,
        connectedPartners: relationships.connectedPartners,
        statement: relationships.statement,
      };
    },
    OVERVIEW_CACHE_TTL_MS,
  );

export const warmOverviewDashboard = (dbName: string): void => {
  const company = dbName.trim();
  if (!company) return;

  const run = (): void => {
    void getOverviewDashboard(company).catch((error: unknown) => {
      logger.warn({
        db: company,
        err: error instanceof Error ? error : new Error(String(error)),
        msg: "Overview dashboard warm failed (non-fatal)",
      });
    });
  };
  if (typeof setImmediate === "function") setImmediate(run);
  else setTimeout(run, 0);
};
