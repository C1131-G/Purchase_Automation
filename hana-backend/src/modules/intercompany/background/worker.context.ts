import {
  createDetectMissedPqDraftJob,
  createEmptyMissedPqDraftSource,
  type DetectMissedPqDraftJob,
  type MissedPqDraftSource,
} from "@/modules/intercompany/background/jobs/01-detect-missed-pq-draft/detect-missed-pq-draft.job";
import {
  createProcessRetryQueueJob,
  type ProcessRetryQueueJob,
  type RetryActionHandler,
} from "@/modules/intercompany/background/jobs/02-process-retry-queue/process-retry-queue.job";
import {
  createSessionCleanupJob,
  type SessionCleanupJob,
} from "@/modules/intercompany/background/jobs/03-session-cleanup/session-cleanup.job";
import {
  createSchedulerService,
  type SchedulerService,
} from "@/modules/intercompany/background/scheduler/scheduler.mutations";
import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import type { ConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { HistoryService } from "@/modules/intercompany/domain/history/history.service";
import { createHistoryService } from "@/modules/intercompany/domain/history/history.service";
import type { NotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import type { RetryService } from "@/modules/intercompany/domain/retry/retry.service";
import { createRetryService } from "@/modules/intercompany/domain/retry/retry.service";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import type { Flow1Orchestrator } from "@/modules/intercompany/flows/flow-1-pq-draft-rfq-chain/flow-1.orchestrator";
import { createFlow1Orchestrator } from "@/modules/intercompany/flows/flow-1-pq-draft-rfq-chain/flow-1.orchestrator";
import { getIcSqlClient, type IcSqlClient } from "@/modules/intercompany/infrastructure/ic-sql";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createIcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

export type IcWorkerContext = {
  sql: IcSqlClient;
  configuration: ConfigurationService;
  company: CompanyService;
  scheduler: SchedulerService;
  detectMissedPqDraft: DetectMissedPqDraftJob;
  processRetryQueue: ProcessRetryQueueJob;
  sessionCleanup: SessionCleanupJob;
};

export type CreateIcWorkerContextDeps = {
  sql?: IcSqlClient;
  configuration?: ConfigurationService;
  company?: CompanyService;
  documentMap?: DocumentMapService;
  notifications?: NotificationService;
  history?: HistoryService;
  retry?: RetryService;
  rfq?: RfqService;
  documents?: IcSlDocuments;
  flow1?: Flow1Orchestrator;
  missedDraftSource?: MissedPqDraftSource;
  retryHandlers?: Partial<Record<string, RetryActionHandler>>;
  scheduler?: SchedulerService;
};

export type WorkerLoopResult = {
  detect: Awaited<ReturnType<IcWorkerContext["detectMissedPqDraft"]["run"]>>;
  retry: Awaited<ReturnType<IcWorkerContext["processRetryQueue"]["run"]>>;
  session: Awaited<ReturnType<IcWorkerContext["sessionCleanup"]["run"]>>;
};

/** One full job cycle (detect → retry → session cleanup). Safe for unit tests. */
export const runWorkerLoop = async (ctx: IcWorkerContext): Promise<WorkerLoopResult> => {
  const detect = await ctx.detectMissedPqDraft.run();
  const retry = await ctx.processRetryQueue.run();
  const session = await ctx.sessionCleanup.run();
  return { detect, retry, session };
};

/** Build job graph once for the worker process (or unit tests). */
export const createIcWorkerContext = (deps?: CreateIcWorkerContextDeps): IcWorkerContext => {
  const sql = deps?.sql ?? getIcSqlClient();
  const configuration = deps?.configuration ?? createConfigurationService();
  const company = deps?.company ?? createCompanyService();
  const scheduler = deps?.scheduler ?? createSchedulerService(sql);
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const notifications = deps?.notifications ?? createNotificationService();
  const history = deps?.history ?? createHistoryService();
  const retry = deps?.retry ?? createRetryService();
  const rfq = deps?.rfq ?? createRfqService();
  const documents = deps?.documents ?? createIcSlDocuments();
  const flow1 = deps?.flow1 ?? createFlow1Orchestrator();
  const missedDraftSource = deps?.missedDraftSource ?? createEmptyMissedPqDraftSource();

  return {
    company,
    configuration,
    detectMissedPqDraft: createDetectMissedPqDraftJob({
      company,
      configuration,
      flow1,
      scheduler,
      source: missedDraftSource,
      sql,
    }),
    processRetryQueue: createProcessRetryQueueJob({
      documentMap,
      documents,
      handlers: deps?.retryHandlers,
      history,
      notifications,
      retry,
      rfq,
      scheduler,
      sql,
    }),
    scheduler,
    sessionCleanup: createSessionCleanupJob({ scheduler, sql }),
    sql,
  };
};
