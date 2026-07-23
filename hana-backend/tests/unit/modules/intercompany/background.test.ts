import { describe, expect, it } from "vitest";

import { createDetectMissedPqDraftJob } from "@/modules/intercompany/background/jobs/01-detect-missed-pq-draft/detect-missed-pq-draft.job";
import { createProcessRetryQueueJob } from "@/modules/intercompany/background/jobs/02-process-retry-queue/process-retry-queue.job";
import { createSessionCleanupJob } from "@/modules/intercompany/background/jobs/03-session-cleanup/session-cleanup.job";
import { createSchedulerService } from "@/modules/intercompany/background/scheduler/scheduler.mutations";
import {
  createIcWorkerContext,
  runWorkerLoop,
} from "@/modules/intercompany/background/worker.context";
import { createBpMappingQueries } from "@/modules/intercompany/config/bp-mapping/bp-mapping.queries";
import { createBpMappingService } from "@/modules/intercompany/config/bp-mapping/bp-mapping.service";
import { createCompanyQueries } from "@/modules/intercompany/config/company/company.queries";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import { createConfigurationQueries } from "@/modules/intercompany/config/configuration/configuration.queries";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createDocumentMapMutations } from "@/modules/intercompany/domain/document-map/document-map.mutations";
import { createDocumentMapQueries } from "@/modules/intercompany/domain/document-map/document-map.queries";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createHistoryMutations } from "@/modules/intercompany/domain/history/history.mutations";
import { createHistoryService } from "@/modules/intercompany/domain/history/history.service";
import { createNotificationMutations } from "@/modules/intercompany/domain/notification/notification.mutations";
import { createNotificationQueries } from "@/modules/intercompany/domain/notification/notification.queries";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createRetryMutations } from "@/modules/intercompany/domain/retry/retry.mutations";
import { createRetryQueries } from "@/modules/intercompany/domain/retry/retry.queries";
import { createRetryService } from "@/modules/intercompany/domain/retry/retry.service";
import { createRfqMutations } from "@/modules/intercompany/domain/rfq/rfq.mutations";
import { createRfqQueries } from "@/modules/intercompany/domain/rfq/rfq.queries";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createFlow1Orchestrator } from "@/modules/intercompany/flows/flow-1-pq-draft-rfq-chain/flow-1.orchestrator";
import {
  IC_ACTION,
  IC_CONFIG_KEY,
  IC_RETRY_STATUS,
} from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import { createResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import {
  createMemoryDb,
  createMemorySqlClient,
  seedMemoryCompanyGraph,
} from "@/modules/intercompany/testing/memory-sql";

const enableFlow1 = (db: ReturnType<typeof createMemoryDb>): void => {
  db.tables.IC_CONFIGURATION.push({
    CONFIG_ID: 1,
    CONFIG_KEY: IC_CONFIG_KEY.ENABLE_FLOW1_RFQ_CHAIN,
    CONFIG_VALUE: "1",
    DESCRIPTION: "test",
  });
};

const createBackgroundStack = () => {
  const db = createMemoryDb();
  seedMemoryCompanyGraph(db);
  enableFlow1(db);
  const sql = createMemorySqlClient(db);

  const company = createCompanyService(createCompanyQueries(sql));
  const bpMapping = createBpMappingService(createBpMappingQueries(sql));
  const resolvePartner = createResolvePartnerService({ bpMapping, company });
  const configuration = createConfigurationService(createConfigurationQueries(sql));
  const documentMap = createDocumentMapService({
    mutations: createDocumentMapMutations(sql),
    queries: createDocumentMapQueries(sql),
  });
  const notifications = createNotificationService({
    mutations: createNotificationMutations(sql),
    queries: createNotificationQueries(sql),
  });
  const history = createHistoryService({
    mutations: createHistoryMutations(sql),
  });
  const retry = createRetryService({
    mutations: createRetryMutations(sql),
    queries: createRetryQueries(sql),
  });
  const rfq = createRfqService({
    mutations: createRfqMutations(sql),
    queries: createRfqQueries(sql),
  });
  const scheduler = createSchedulerService(sql);
  const flow1 = createFlow1Orchestrator({
    configuration,
    documentMap,
    history,
    notifications,
    resolvePartner,
    rfq,
  });

  return {
    company,
    configuration,
    db,
    documentMap,
    flow1,
    history,
    notifications,
    retry,
    rfq,
    scheduler,
    sql,
  };
};

describe("P7 background worker jobs", () => {
  it("T7.1 retry success with mock action", async () => {
    const stack = createBackgroundStack();
    const enqueued = await stack.retry.enqueue({
      actionCode: "TEST_ACTION",
      companyId: 1,
      maxRetry: 2,
      nextRetryAt: null,
      payloadJson: JSON.stringify({ n: 1 }),
      sourceDocument: IC_OBJECT.PO,
      targetDocument: IC_OBJECT.AR_DRAFT,
    });

    let handled = 0;
    const job = createProcessRetryQueueJob({
      handlers: {
        TEST_ACTION: async () => {
          handled += 1;
        },
      },
      notifications: stack.notifications,
      retry: stack.retry,
      scheduler: stack.scheduler,
      sql: stack.sql,
    });

    const result = await job.run();
    expect(result.claimed).toBe(1);
    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.dead).toBe(0);
    expect(handled).toBe(1);

    const row = await stack.retry.claimDue(10);
    expect(row).toHaveLength(0);

    const stored = stack.db.tables.IC_RETRY_QUEUE.find(
      (item) => item.RETRY_ID === enqueued.retryId,
    );
    expect(stored?.STATUS).toBe(IC_RETRY_STATUS.SUCCESS);
  });

  it("T7.2 retry exceeds max → DEAD + notify", async () => {
    const stack = createBackgroundStack();
    await stack.retry.enqueue({
      actionCode: "ALWAYS_FAIL",
      companyId: 1,
      maxRetry: 2,
      nextRetryAt: null,
      sourceDocument: IC_OBJECT.PO,
      targetDocument: IC_OBJECT.AR_DRAFT,
    });

    const job = createProcessRetryQueueJob({
      handlers: {
        ALWAYS_FAIL: async () => {
          throw new Error("simulated partner failure");
        },
      },
      notifications: stack.notifications,
      retry: stack.retry,
      scheduler: stack.scheduler,
      sql: stack.sql,
    });

    const first = await job.run();
    expect(first.claimed).toBe(1);
    expect(first.failed).toBe(1);
    expect(first.dead).toBe(0);

    // mark due again (NEXT_RETRY_AT set to +5min in production; force due for test)
    const waiting = stack.db.tables.IC_RETRY_QUEUE.find((row) => row.STATUS === "WAITING");
    expect(waiting).toBeTruthy();
    if (waiting) {
      waiting.NEXT_RETRY_AT = null;
    }

    const second = await job.run();
    expect(second.claimed).toBe(1);
    expect(second.dead).toBe(1);
    expect(second.failed).toBe(0);

    const dead = stack.db.tables.IC_RETRY_QUEUE.find((row) => row.STATUS === IC_RETRY_STATUS.DEAD);
    expect(dead).toBeTruthy();
    expect(dead?.RETRY_COUNT).toBe(2);

    const deadNotify = stack.db.tables.IC_NOTIFICATION.find(
      (row) => row.FLOW_STEP === "RETRY_DEAD" && row.COMPANY_ID === 1,
    );
    expect(deadNotify).toBeTruthy();
  });

  it("T7.3 detect does not duplicate RFQ", async () => {
    const stack = createBackgroundStack();

    // First run creates RFQ for draft 55 (only buyer company A)
    const source = {
      listForCompany: async (company: { companyId: number; sapDbName: string }) => {
        if (company.companyId !== 1) {
          return [];
        }
        return [
          {
            cardCode: "V-B",
            dbName: company.sapDbName,
            docEntry: 55,
            docNum: 10055,
            lines: [{ ItemCode: "I1", Quantity: 2, UnitPrice: 10 }],
          },
        ];
      },
    };

    const job = createDetectMissedPqDraftJob({
      company: stack.company,
      configuration: stack.configuration,
      flow1: stack.flow1,
      scheduler: stack.scheduler,
      source,
      sql: stack.sql,
    });

    const first = await job.run();
    expect(first.processed).toBe(1);
    expect(first.created).toBe(1);
    expect(stack.db.tables.IC_RFQ_HEADER).toHaveLength(1);

    const second = await job.run();
    expect(second.processed).toBe(1);
    expect(second.skipped).toBe(1);
    expect(second.created).toBe(0);
    expect(stack.db.tables.IC_RFQ_HEADER).toHaveLength(1);
  });

  it("T7.4 session cleanup removes expired", async () => {
    const stack = createBackgroundStack();
    stack.db.tables.IC_SL_SESSION.push(
      {
        COMPANY_ID: 1,
        CONNECTION_ID: 1,
        EXPIRY_TIME: new Date(Date.now() - 60_000).toISOString(),
        LOGIN_TIME: new Date(Date.now() - 120_000).toISOString(),
        ROUTE_ID: null,
        SESSION_ID: 1,
        SESSION_TOKEN: "expired-token",
      },
      {
        COMPANY_ID: 2,
        CONNECTION_ID: 2,
        EXPIRY_TIME: new Date(Date.now() + 3600_000).toISOString(),
        LOGIN_TIME: new Date().toISOString(),
        ROUTE_ID: "r1",
        SESSION_ID: 2,
        SESSION_TOKEN: "live-token",
      },
    );

    const job = createSessionCleanupJob({
      scheduler: stack.scheduler,
      sql: stack.sql,
    });
    const result = await job.run();
    expect(result.removed).toBe(1);
    expect(stack.db.tables.IC_SL_SESSION).toHaveLength(1);
    expect(stack.db.tables.IC_SL_SESSION[0]?.SESSION_TOKEN).toBe("live-token");
  });

  it("T7.5 worker one loop runs all jobs (offline)", async () => {
    const stack = createBackgroundStack();
    stack.db.tables.IC_SL_SESSION.push({
      COMPANY_ID: 1,
      CONNECTION_ID: 1,
      EXPIRY_TIME: new Date(Date.now() - 1).toISOString(),
      LOGIN_TIME: new Date(Date.now() - 2).toISOString(),
      ROUTE_ID: null,
      SESSION_ID: 9,
      SESSION_TOKEN: "gone",
    });

    await stack.retry.enqueue({
      actionCode: IC_ACTION.FLOW2_CREATE_AR_DRAFT,
      companyId: 1,
      maxRetry: 2,
      nextRetryAt: null,
      payloadJson: JSON.stringify({ note: "noop-handler-override" }),
      sourceDocument: IC_OBJECT.PO,
      targetDocument: IC_OBJECT.AR_DRAFT,
    });

    const ctx = createIcWorkerContext({
      company: stack.company,
      configuration: stack.configuration,
      documentMap: stack.documentMap,
      flow1: stack.flow1,
      history: stack.history,
      missedDraftSource: {
        listForCompany: async () => [],
      },
      notifications: stack.notifications,
      retry: stack.retry,
      retryHandlers: {
        [IC_ACTION.FLOW2_CREATE_AR_DRAFT]: async () => {
          // success path without SL
        },
      },
      rfq: stack.rfq,
      scheduler: stack.scheduler,
      sql: stack.sql,
    });

    const loop = await runWorkerLoop(ctx);
    expect(loop.detect.companies).toBeGreaterThanOrEqual(1);
    expect(loop.retry.success).toBe(1);
    expect(loop.session.removed).toBe(1);
  });
});
