import { logger } from "@/core/logger/pino-logger";
import {
  createSchedulerService,
  type SchedulerService,
} from "@/modules/intercompany/background/scheduler/scheduler.mutations";
import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import type { ConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import type { IcCompany } from "@/modules/intercompany/config/company/company.types";
import {
  createFlow1Orchestrator,
  type Flow1Orchestrator,
} from "@/modules/intercompany/flows/flow-1-pq-rfq-chain/flow-1.orchestrator";
import type { IcPqDraftHookInput } from "@/modules/intercompany/flows/shared/flow.types";
import { IC_CONFIG_KEY, IC_JOB_NAME } from "@/modules/intercompany/infrastructure/constants";
import { getIcSqlClient, type IcSqlClient } from "@/modules/intercompany/infrastructure/ic-sql";

/**
 * Source of PQ draft candidates the API hook may have missed.
 * Production can inject an SL Drafts scanner; tests inject fixed candidates.
 * Default is a no-op (empty list) so the worker is safe without SL scan wiring.
 */
export type MissedPqSource = {
  listForCompany: (company: IcCompany) => Promise<IcPqDraftHookInput[]>;
};

export const createEmptyMissedPqSource = (): MissedPqSource => ({
  listForCompany: async () => [],
});

export type DetectMissedPqResult = {
  companies: number;
  processed: number;
  created: number;
  skipped: number;
  failed: number;
};

export type DetectMissedPqJob = {
  run: () => Promise<DetectMissedPqResult>;
};

/**
 * Safety-net for Flow 1: for each active company, load candidate PQ drafts and
 * run Flow 1 capture→create RFQ→notify. Capture/create are idempotent (no duplicate RFQ).
 */
export const createDetectMissedPqJob = (deps?: {
  sql?: IcSqlClient;
  company?: CompanyService;
  configuration?: ConfigurationService;
  flow1?: Flow1Orchestrator;
  source?: MissedPqSource;
  scheduler?: SchedulerService;
}): DetectMissedPqJob => {
  const sql = deps?.sql ?? getIcSqlClient();
  const company = deps?.company ?? createCompanyService();
  const configuration = deps?.configuration ?? createConfigurationService();
  const flow1 = deps?.flow1 ?? createFlow1Orchestrator();
  const source = deps?.source ?? createEmptyMissedPqSource();
  const scheduler = deps?.scheduler ?? createSchedulerService(sql);

  return {
    run: async () => {
      await scheduler.ensureJob(IC_JOB_NAME.DETECT_PQ_DRAFT);

      const result: DetectMissedPqResult = {
        companies: 0,
        created: 0,
        failed: 0,
        processed: 0,
        skipped: 0,
      };

      const flow1On = await configuration.isFlow1Enabled();
      if (!flow1On) {
        await scheduler.markRun({
          jobName: IC_JOB_NAME.DETECT_PQ_DRAFT,
          lastError: null,
          status: "IDLE",
        });
        logger.info({
          msg: "Detect missed PQ draft skipped — Flow 1 disabled",
          scope: "ic.job.detect_missed_pq_draft",
        });
        return result;
      }

      await scheduler.markRun({
        jobName: IC_JOB_NAME.DETECT_PQ_DRAFT,
        status: "RUNNING",
      });

      try {
        const companies = await company.listActive();
        result.companies = companies.length;

        const cronMinutes = await configuration.getNumber(
          IC_CONFIG_KEY.DETECT_DRAFT_CRON_MINUTES,
          5,
        );
        const nextRun = new Date(Date.now() + Math.max(cronMinutes, 1) * 60_000);

        for (const activeCompany of companies) {
          let candidates: IcPqDraftHookInput[] = [];
          try {
            candidates = await source.listForCompany(activeCompany);
          } catch (sourceErr: unknown) {
            const message = sourceErr instanceof Error ? sourceErr.message : String(sourceErr);
            logger.warn({
              companyId: activeCompany.companyId,
              err: sourceErr instanceof Error ? sourceErr : new Error(message),
              msg: "Missed PQ draft source failed for company",
              scope: "ic.job.detect_missed_pq_draft",
            });
            result.failed += 1;
            continue;
          }

          for (const candidate of candidates) {
            result.processed += 1;
            try {
              const input: IcPqDraftHookInput = {
                ...candidate,
                dbName: candidate.dbName?.trim() || activeCompany.sapDbName,
              };
              const outcome = await flow1.run(input);
              if (outcome.status === "success") {
                result.created += 1;
              } else if (outcome.status === "skipped") {
                result.skipped += 1;
              } else {
                result.failed += 1;
              }
            } catch (runErr: unknown) {
              result.failed += 1;
              const message = runErr instanceof Error ? runErr.message : String(runErr);
              logger.error({
                companyId: activeCompany.companyId,
                docEntry: candidate.docEntry,
                err: runErr instanceof Error ? runErr : new Error(message),
                msg: "Detect Flow 1 run failed for candidate",
                scope: "ic.job.detect_missed_pq_draft",
              });
            }
          }
        }

        await scheduler.markRun({
          jobName: IC_JOB_NAME.DETECT_PQ_DRAFT,
          lastError: null,
          nextRun,
          status: "IDLE",
        });

        logger.info({
          ...result,
          msg: "Detect missed PQ draft complete",
          scope: "ic.job.detect_missed_pq_draft",
        });
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        await scheduler.markRun({
          jobName: IC_JOB_NAME.DETECT_PQ_DRAFT,
          lastError: message.slice(0, 2000),
          status: "ERROR",
        });
        throw err instanceof Error ? err : new Error(message);
      }
    },
  };
};

export const detectMissedPqJob = createDetectMissedPqJob();
