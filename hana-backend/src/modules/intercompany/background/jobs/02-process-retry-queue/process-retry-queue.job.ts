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
import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
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

export type ProcessOneRetryResult =
  | { status: "success"; item: IcRetryQueueItem }
  | { status: "failed"; item: IcRetryQueueItem; errorMessage: string }
  | { status: "dead"; item: IcRetryQueueItem; errorMessage: string };

export type ProcessRetryQueueJob = {
  run: (limit?: number) => Promise<ProcessRetryQueueResult>;
  /** Manual UI path: force WAITING, claim one row, run handler. */
  runOne: (retryId: number) => Promise<ProcessOneRetryResult>;
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
  company: CompanyService;
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

    const arRef = created.docNum != null ? String(created.docNum) : String(created.docEntry);
    const poRef = String(payload.sourceDocEntry ?? item.sourceDocument);
    const buyer = await deps.company.getById(item.companyId);
    const buyerName = buyer?.companyName?.trim() || "Buyer";
    await deps.notifications.create({
      companyId: sellerCompanyId,
      documentId: String(created.docEntry),
      documentType: IC_OBJECT.AR_DRAFT,
      flowStep: "FLOW2_RETRY_SUCCESS",
      message: `AR draft ${arRef} ready for PO ${poRef}.`,
      priority: "MEDIUM",
      title: buyerName,
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

    const sqRef =
      salesQuotation.docNum != null
        ? String(salesQuotation.docNum)
        : String(salesQuotation.docEntry);
    const buyer = await deps.company.getById(header.sourceCompanyId);
    const buyerName = buyer?.companyName?.trim() || "Buyer";
    await deps.notifications.create({
      companyId: sellerCompanyId,
      documentId: String(salesQuotation.docEntry),
      documentType: IC_OBJECT.SQ,
      flowStep: "FLOW1_RETRY_SUCCESS",
      message: `SQ ${sqRef} ready for RFQ ${header.rfqNumber}.`,
      priority: "MEDIUM",
      title: buyerName,
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
    company: createCompanyService(),
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

  const executeClaimed = async (item: IcRetryQueueItem): Promise<ProcessOneRetryResult> => {
    const handler = handlers[item.actionCode];
    try {
      if (!handler) {
        throw new Error(`No retry handler for actionCode=${item.actionCode}`);
      }
      await handler(item);
      const successItem = await retry.markSuccess(item.retryId);
      return {
        item: successItem ?? { ...item, status: IC_RETRY_STATUS.SUCCESS },
        status: "success",
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const updated = await retry.markFailedOrDead(item.retryId, message.slice(0, 2000));
      if (updated?.status === IC_RETRY_STATUS.DEAD) {
        try {
          await notifications.create({
            companyId: item.companyId,
            documentId: String(item.retryId),
            documentType: "RETRY",
            flowStep: "RETRY_DEAD",
            message: `Failed after ${updated.retryCount}/${updated.maxRetry} attempts: ${message.slice(0, 200)}`,
            priority: "HIGH",
            title: "System",
          });
        } catch {
          // best-effort notify
        }
        logger.warn({
          actionCode: item.actionCode,
          err: err instanceof Error ? err : new Error(message),
          msg: "IC retry action failed",
          retryId: item.retryId,
          scope: "ic.job.process_retry",
          status: updated.status,
        });
        return { errorMessage: message, item: updated, status: "dead" };
      }
      logger.warn({
        actionCode: item.actionCode,
        err: err instanceof Error ? err : new Error(message),
        msg: "IC retry action failed",
        retryId: item.retryId,
        scope: "ic.job.process_retry",
        status: updated?.status,
      });
      return {
        errorMessage: message,
        item: updated ?? item,
        status: "failed",
      };
    }
  };

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
          const one = await executeClaimed(item);
          if (one.status === "success") {
            result.success += 1;
          } else if (one.status === "dead") {
            result.dead += 1;
          } else {
            result.failed += 1;
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

    runOne: async (retryId) => {
      const existing = await retry.findById(retryId);
      if (!existing) {
        throw new Error(`IC_RETRY_QUEUE row not found id=${retryId}`);
      }
      if (existing.status === IC_RETRY_STATUS.SUCCESS) {
        throw new Error(`Retry ${retryId} already SUCCESS`);
      }
      if (existing.status === IC_RETRY_STATUS.PROCESSING) {
        throw new Error(`Retry ${retryId} is already PROCESSING`);
      }

      const forced = await retry.forceWaiting(retryId);
      if (!forced || forced.status !== IC_RETRY_STATUS.WAITING) {
        throw new Error(`Retry ${retryId} cannot be re-queued (status=${existing.status})`);
      }

      const claimed = await retry.claim(retryId);
      if (!claimed || claimed.status !== IC_RETRY_STATUS.PROCESSING) {
        throw new Error(`Retry ${retryId} claim failed`);
      }

      return executeClaimed(claimed);
    },
  };
};

export const processRetryQueueJob = createProcessRetryQueueJob();
