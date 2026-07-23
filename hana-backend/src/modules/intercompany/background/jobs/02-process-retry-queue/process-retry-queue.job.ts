import { logger } from "@/core/logger/pino-logger";
import {
  createSchedulerService,
  type SchedulerService,
} from "@/modules/intercompany/background/scheduler/scheduler.mutations";
import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { HistoryService } from "@/modules/intercompany/domain/history/history.service";
import { createHistoryService } from "@/modules/intercompany/domain/history/history.service";
import type { NotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import type { RetryService } from "@/modules/intercompany/domain/retry/retry.service";
import { createRetryService } from "@/modules/intercompany/domain/retry/retry.service";
import type { IcRetryQueueItem } from "@/modules/intercompany/domain/retry/retry.types";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import type { TaxMappingService } from "@/modules/intercompany/config/tax-mapping/tax-mapping.service";
import { createTaxMappingService } from "@/modules/intercompany/config/tax-mapping/tax-mapping.service";
import {
  IC_ACTION,
  IC_DOC_MAP_STATUS,
  IC_JOB_NAME,
  IC_RETRY_STATUS,
} from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createIcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createSellerSq } from "@/modules/intercompany/flows/flow-1-pq-draft-rfq-chain/05-convert-pq-and-sq/create-seller-sq";
import { getIcSqlClient, type IcSqlClient } from "@/modules/intercompany/infrastructure/ic-sql";

export type RetryActionHandler = (item: IcRetryQueueItem) => Promise<void>;

export type ProcessRetryQueueResult = {
  claimed: number;
  success: number;
  failed: number;
  dead: number;
};

export type ProcessRetryQueueJob = {
  run: (limit?: number) => Promise<ProcessRetryQueueResult>;
};

const parsePayload = (raw: string | null): Record<string, unknown> => {
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
};

const createDefaultHandlers = (deps: {
  documents: IcSlDocuments;
  documentMap: DocumentMapService;
  rfq: RfqService;
  taxMapping: TaxMappingService;
  notifications: NotificationService;
  history: HistoryService;
}): Record<string, RetryActionHandler> => {
  const flow2CreateArDraft: RetryActionHandler = async (item) => {
    const payload = parsePayload(item.payloadJson);
    const sellerCompanyId = Number(payload.sellerCompanyId);
    const draftPayload = payload.draftPayload;
    if (!Number.isFinite(sellerCompanyId) || sellerCompanyId <= 0) {
      throw new Error("FLOW2_CREATE_AR_DRAFT payload missing sellerCompanyId");
    }
    if (!draftPayload || typeof draftPayload !== "object") {
      throw new Error("FLOW2_CREATE_AR_DRAFT payload missing draftPayload");
    }

    const created = await deps.documents.createArInvoiceDraft({
      companyId: sellerCompanyId,
      draftPayload: draftPayload as Record<string, unknown>,
    });

    if (item.docMappingId) {
      await deps.documentMap.updateStatus(item.docMappingId, IC_DOC_MAP_STATUS.SUCCESS, {
        errorMessage: null,
        targetDocEntry: String(created.docEntry),
        targetDocNum: created.docNum != null ? String(created.docNum) : null,
        targetObject: IC_OBJECT.AR_DRAFT,
      });
    }

    await deps.notifications.create({
      companyId: sellerCompanyId,
      documentId: String(created.docEntry),
      documentType: IC_OBJECT.AR_DRAFT,
      flowStep: "FLOW2_RETRY_SUCCESS",
      message: `AR invoice draft ${created.docEntry} created on retry for PO ${payload.sourceDocEntry ?? item.sourceDocument}.`,
      priority: "MEDIUM",
      title: "IC Flow 2 retry succeeded",
    });

    await deps.history.append({
      action: IC_ACTION.FLOW2_CREATE_AR_DRAFT,
      companyId: item.companyId,
      documentEntry: String(payload.sourceDocEntry ?? item.sourceDocument),
      documentType: IC_OBJECT.PO,
      durationMs: null,
      responseJson: JSON.stringify({
        docEntry: created.docEntry,
        docNum: created.docNum,
        retryId: item.retryId,
      }),
      status: "SUCCESS",
    });
  };

  const flow1ConvertPqSq: RetryActionHandler = async (item) => {
    const payload = parsePayload(item.payloadJson);
    const rfqId = Number(payload.rfqId);
    const sellerCompanyId = Number(payload.sellerCompanyId);
    const buyerCustomerCode = String(payload.buyerCustomerCode ?? "").trim();
    const pqDocEntry = Number(payload.pqDocEntry);
    const remarksTag = String(payload.remarksTag ?? `IC-RETRY-${item.retryId}`);

    if (!Number.isFinite(rfqId) || rfqId <= 0) {
      throw new Error("FLOW1_CONVERT_PQ_SQ payload missing rfqId");
    }
    if (!Number.isFinite(sellerCompanyId) || sellerCompanyId <= 0) {
      throw new Error("FLOW1_CONVERT_PQ_SQ payload missing sellerCompanyId");
    }
    if (!buyerCustomerCode) {
      throw new Error("FLOW1_CONVERT_PQ_SQ payload missing buyerCustomerCode");
    }

    const header = await deps.rfq.getById(rfqId);
    if (!header) {
      throw new Error(`RFQ ${rfqId} not found for retry`);
    }
    if (header.status === "COMPLETED") {
      return;
    }

    const lines = header.lines ?? [];
    const mapTaxCode = async (sourceTaxCode: string): Promise<string> => {
      const mapped = await deps.taxMapping.mapTax(
        header.sourceCompanyId,
        header.targetCompanyId,
        sourceTaxCode,
      );
      return mapped.hit ? mapped.targetTaxCode : sourceTaxCode;
    };

    const salesQuotation = await createSellerSq({
      buyerCustomerCode,
      documents: deps.documents,
      lines,
      mapTaxCode,
      remarks: remarksTag,
      sellerCompanyId,
    });

    if (item.docMappingId) {
      await deps.documentMap.updateStatus(item.docMappingId, IC_DOC_MAP_STATUS.SUCCESS, {
        errorMessage: null,
        targetDocEntry: String(salesQuotation.docEntry),
        targetDocNum: salesQuotation.docNum != null ? String(salesQuotation.docNum) : null,
        targetObject: IC_OBJECT.SQ,
      });
    } else {
      await deps.documentMap.create({
        sourceCompanyId: header.sourceCompanyId,
        sourceDocEntry: String(Number.isFinite(pqDocEntry) ? pqDocEntry : header.pqDraftDocEntry),
        sourceObject: IC_OBJECT.PQ,
        sourceRemarksTag: remarksTag,
        status: IC_DOC_MAP_STATUS.SUCCESS,
        targetCompanyId: sellerCompanyId,
        targetDocEntry: String(salesQuotation.docEntry),
        targetDocNum: salesQuotation.docNum != null ? String(salesQuotation.docNum) : null,
        targetObject: IC_OBJECT.SQ,
      });
    }

    await deps.rfq.complete(rfqId);

    await deps.notifications.create({
      companyId: sellerCompanyId,
      documentId: String(salesQuotation.docEntry),
      documentType: IC_OBJECT.SQ,
      flowStep: "FLOW1_RETRY_SUCCESS",
      message: `SQ ${salesQuotation.docEntry} created on retry for RFQ ${header.rfqNumber}.`,
      priority: "MEDIUM",
      title: "IC Flow 1 SQ retry succeeded",
    });

    await deps.history.append({
      action: IC_ACTION.FLOW1_CONVERT_PQ_SQ,
      companyId: item.companyId,
      documentEntry: String(rfqId),
      documentType: IC_OBJECT.RFQ,
      durationMs: null,
      responseJson: JSON.stringify({
        pqDocEntry: payload.pqDocEntry,
        retryId: item.retryId,
        sqDocEntry: salesQuotation.docEntry,
      }),
      status: "SUCCESS",
    });
  };

  return {
    [IC_ACTION.FLOW1_CONVERT_PQ_SQ]: flow1ConvertPqSq,
    [IC_ACTION.FLOW2_CREATE_AR_DRAFT]: flow2CreateArDraft,
  };
};

/**
 * Claim due IC_RETRY_QUEUE rows and re-run the failed partner action.
 * On repeated failure past max → DEAD + notification.
 */
export const createProcessRetryQueueJob = (deps?: {
  sql?: IcSqlClient;
  retry?: RetryService;
  documents?: IcSlDocuments;
  documentMap?: DocumentMapService;
  rfq?: RfqService;
  taxMapping?: TaxMappingService;
  notifications?: NotificationService;
  history?: HistoryService;
  scheduler?: SchedulerService;
  /** Override / inject handlers (tests). Unknown action codes fail the item. */
  handlers?: Partial<Record<string, RetryActionHandler>>;
}): ProcessRetryQueueJob => {
  const sql = deps?.sql ?? getIcSqlClient();
  const retry = deps?.retry ?? createRetryService();
  const notifications = deps?.notifications ?? createNotificationService();
  const scheduler = deps?.scheduler ?? createSchedulerService(sql);

  const defaultHandlers = createDefaultHandlers({
    documentMap: deps?.documentMap ?? createDocumentMapService(),
    documents: deps?.documents ?? createIcSlDocuments(),
    history: deps?.history ?? createHistoryService(),
    notifications,
    rfq: deps?.rfq ?? createRfqService(),
    taxMapping: deps?.taxMapping ?? createTaxMappingService(),
  });

  const handlers: Record<string, RetryActionHandler> = { ...defaultHandlers };
  if (deps?.handlers) {
    for (const [actionCode, handler] of Object.entries(deps.handlers)) {
      if (handler) {
        handlers[actionCode] = handler;
      }
    }
  }

  return {
    run: async (limit = 50) => {
      await scheduler.ensureJob(IC_JOB_NAME.PROCESS_RETRY);
      await scheduler.markRun({
        jobName: IC_JOB_NAME.PROCESS_RETRY,
        status: "RUNNING",
      });

      const result: ProcessRetryQueueResult = {
        claimed: 0,
        dead: 0,
        failed: 0,
        success: 0,
      };

      try {
        const claimed = await retry.claimDue(limit);
        result.claimed = claimed.length;

        for (const item of claimed) {
          const handler = handlers[item.actionCode];
          try {
            if (!handler) {
              throw new Error(`No retry handler for actionCode=${item.actionCode}`);
            }
            await handler(item);
            await retry.markSuccess(item.retryId);
            result.success += 1;
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            const updated = await retry.markFailedOrDead(item.retryId, message.slice(0, 2000));
            if (updated?.status === IC_RETRY_STATUS.DEAD) {
              result.dead += 1;
              try {
                await notifications.create({
                  companyId: item.companyId,
                  documentId: String(item.retryId),
                  documentType: "RETRY",
                  flowStep: "RETRY_DEAD",
                  message: `Retry ${item.retryId} (${item.actionCode}) exhausted after ${updated.retryCount}/${updated.maxRetry}: ${message.slice(0, 500)}`,
                  priority: "HIGH",
                  title: `IC retry DEAD — ${item.actionCode}`,
                });
              } catch {
                // best-effort notify
              }
            } else {
              result.failed += 1;
            }
            logger.warn({
              actionCode: item.actionCode,
              err: err instanceof Error ? err : new Error(message),
              msg: "IC retry action failed",
              retryId: item.retryId,
              scope: "ic.job.process_retry",
              status: updated?.status,
            });
          }
        }

        await scheduler.markRun({
          jobName: IC_JOB_NAME.PROCESS_RETRY,
          lastError: null,
          status: "IDLE",
        });

        logger.info({
          ...result,
          msg: "IC process retry queue complete",
          scope: "ic.job.process_retry",
        });
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        await scheduler.markRun({
          jobName: IC_JOB_NAME.PROCESS_RETRY,
          lastError: message.slice(0, 2000),
          status: "ERROR",
        });
        throw err instanceof Error ? err : new Error(message);
      }
    },
  };
};

export const processRetryQueueJob = createProcessRetryQueueJob();
