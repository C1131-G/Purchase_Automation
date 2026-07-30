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
import type { PartnerTaxResolver } from "@/modules/intercompany/config/tax-mapping/resolve-partner-tax.service";
import { createPartnerTaxResolver } from "@/modules/intercompany/config/tax-mapping/resolve-partner-tax.service";
import {
  IC_ACTION,
  IC_DOC_MAP_STATUS,
  IC_JOB_NAME,
  IC_RETRY_STATUS,
} from "@/modules/intercompany/infrastructure/constants";
import {
  FLOW1_RETRY_STEPS,
  FLOW2_RETRY_STEPS,
  logFlowStep,
} from "@/modules/intercompany/infrastructure/flow-step-log";
import {
  buildFlow1SqRemarks,
  formatIcDocLabel,
} from "@/modules/intercompany/infrastructure/ic-remarks-chain";
import { IC_LOG_SCOPE } from "@/modules/intercompany/infrastructure/ic-logger";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createIcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createSellerSq } from "@/modules/intercompany/flows/flow-1-pq-rfq-chain/05-convert-pq-and-sq/create-seller-sq";
import { getIcSqlClient, type IcSqlClient } from "@/modules/intercompany/infrastructure/ic-sql";

/** Map retry action → same step numbers as the original failed flow step. */
const retryStepMeta = (actionCode: string) => {
  if (actionCode === IC_ACTION.FLOW1_CONVERT_PQ_SQ) {
    return {
      scope: IC_LOG_SCOPE.FLOW1,
      steps: FLOW1_RETRY_STEPS,
    };
  }
  if (actionCode === IC_ACTION.FLOW2_CREATE_AR_DRAFT) {
    return {
      scope: IC_LOG_SCOPE.FLOW2,
      steps: FLOW2_RETRY_STEPS,
    };
  }
  return null;
};

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
  partnerTax: PartnerTaxResolver;
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
        targetObject: IC_OBJECT.AR_INVOICE,
      });
    }

    // Retry success: notify seller only (AR invoice handoff), same as live Flow 2.
    const sourceDocEntryRaw = payload.sourceDocEntry;
    const sourceDocNumRaw = payload.sourceDocNum;
    const poLabel = formatIcDocLabel({
      kind: "PO",
      docEntry:
        sourceDocEntryRaw === null || sourceDocEntryRaw === undefined
          ? null
          : typeof sourceDocEntryRaw === "string" || typeof sourceDocEntryRaw === "number"
            ? sourceDocEntryRaw
            : String(sourceDocEntryRaw),
      docNum:
        sourceDocNumRaw === null || sourceDocNumRaw === undefined
          ? null
          : typeof sourceDocNumRaw === "string" || typeof sourceDocNumRaw === "number"
            ? sourceDocNumRaw
            : String(sourceDocNumRaw),
    });
    const arLabel = formatIcDocLabel({
      kind: "AR",
      docEntry: created.docEntry,
      docNum: created.docNum ?? null,
    });
    const buyer = await deps.company.getById(item.companyId);
    const buyerName = buyer?.companyName?.trim() || "Buyer";
    await deps.notifications.create({
      companyId: sellerCompanyId,
      documentId: String(created.docEntry),
      documentType: IC_OBJECT.AR_INVOICE,
      flowStep: "FLOW2_AR_INVOICE_CREATED",
      message: `${buyerName}: ${poLabel} created ${arLabel}.`,
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
    const resolveLineTax = async (input: {
      sourceTaxCode: string;
      itemCode: string;
    }): Promise<string> =>
      deps.partnerTax.resolveLineTax({
        docSide: "sales",
        itemCode: input.itemCode,
        sourceCompanyId: header.sourceCompanyId,
        sourceTaxCode: input.sourceTaxCode,
        targetCardCode: buyerCustomerCode,
        targetCompanyId: header.targetCompanyId,
        targetSapDbName: sellerCompany?.sapDbName ?? null,
      });

    // Full IC chain + any stored user remarks (never only compact tag).
    const remarksFromPayload =
      payload.remarks != null && String(payload.remarks).trim()
        ? String(payload.remarks).trim()
        : null;
    const vendorRefNo =
      payload.vendorRefNo != null && String(payload.vendorRefNo).trim()
        ? String(payload.vendorRefNo).trim()
        : header.vendorRefNo != null
          ? String(header.vendorRefNo).trim()
          : null;
    const sqRemarks = buildFlow1SqRemarks({
      existing: remarksFromPayload ?? header.remarks,
      pqDraftDocEntry: header.pqDraftDocEntry,
      pqDraftDocNum: header.pqDraftDocNum,
      pqDocEntry: Number.isFinite(pqDocEntry) ? pqDocEntry : header.pqDraftDocEntry,
      pqDocNum: payload.pqDocNum != null ? Number(payload.pqDocNum) : null,
      rfqId: header.rfqId,
      rfqNumber: header.rfqNumber,
      vendorRefNo,
    });

    const sellerCompany = await deps.company.getById(sellerCompanyId);
    const salesQuotation = await createSellerSq({
      buyerCustomerCode,
      defaultBranchId: sellerCompany?.defaultBranchId ?? null,
      documents: deps.documents,
      lines,
      numAtCard: vendorRefNo,
      remarks: sqRemarks,
      resolveLineTax,
      sapDbName: sellerCompany?.sapDbName ?? null,
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
        sourceDocEntry: String(header.rfqId),
        sourceDocNum: header.rfqNumber,
        sourceObject: IC_OBJECT.RFQ,
        sourceRemarksTag: remarksTag,
        status: IC_DOC_MAP_STATUS.SUCCESS,
        targetCompanyId: sellerCompanyId,
        targetDocEntry: String(salesQuotation.docEntry),
        targetDocNum: salesQuotation.docNum != null ? String(salesQuotation.docNum) : null,
        targetObject: IC_OBJECT.SQ,
      });
    }

    await deps.rfq.complete(rfqId);

    // No convert/retry-success notify: buyer already got FLOW1_RFQ_SUBMITTED;
    // seller already got FLOW1_RFQ_CREATED. Retry only completes the SQ post.

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
  partnerTax?: PartnerTaxResolver;
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
  const company = createCompanyService();
  const partnerTax =
    deps?.partnerTax ??
    createPartnerTaxResolver({
      company,
    });

  const defaultHandlers = createDefaultHandlers({
    company,
    documentMap: deps?.documentMap ?? createDocumentMapService(),
    documents: deps?.documents ?? createIcSlDocuments(),
    history: deps?.history ?? createHistoryService(),
    notifications,
    partnerTax,
    rfq: deps?.rfq ?? createRfqService(),
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
    const meta = retryStepMeta(item.actionCode);
    const logCtx = {
      actionCode: item.actionCode,
      companyId: item.companyId,
      retryCount: item.retryCount,
      retryId: item.retryId,
      sourceDocument: item.sourceDocument,
      targetDocument: item.targetDocument,
    };

    // Same step number as original failure (Flow 1 = 17/18, Flow 2 = 7/9).
    if (meta) {
      logFlowStep(meta.scope, {
        ...meta.steps.START,
        check: "retry_start",
        ctx: logCtx,
        detail: {
          attempt: item.retryCount + 1,
          maxRetry: item.maxRetry,
          phase: "retry",
        },
      });
    } else {
      logger.info({
        ...logCtx,
        msg: "IC retry action start",
        scope: "ic.job.process_retry",
      });
    }

    try {
      if (!handler) {
        throw new Error(`No retry handler for actionCode=${item.actionCode}`);
      }
      await handler(item);
      const successItem = await retry.markSuccess(item.retryId);
      if (meta) {
        logFlowStep(meta.scope, {
          ...meta.steps.SUCCESS,
          check: "retry_success",
          ctx: logCtx,
          detail: {
            attempt: item.retryCount + 1,
            maxRetry: item.maxRetry,
            phase: "retry",
            status: IC_RETRY_STATUS.SUCCESS,
          },
        });
      } else {
        logger.info({
          ...logCtx,
          msg: "IC retry action success",
          scope: "ic.job.process_retry",
          status: IC_RETRY_STATUS.SUCCESS,
        });
      }
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
        if (meta) {
          logFlowStep(meta.scope, {
            ...meta.steps.DEAD,
            check: "retry_dead",
            ctx: logCtx,
            detail: {
              attempt: updated.retryCount,
              errorMessage: message.slice(0, 500),
              maxRetry: updated.maxRetry,
              phase: "retry",
              status: IC_RETRY_STATUS.DEAD,
            },
            outcome: "fail",
          });
        } else {
          logger.warn({
            actionCode: item.actionCode,
            err: err instanceof Error ? err : new Error(message),
            msg: "IC retry action failed",
            retryId: item.retryId,
            scope: "ic.job.process_retry",
            status: updated.status,
          });
        }
        return { errorMessage: message, item: updated, status: "dead" };
      }
      if (meta) {
        logFlowStep(meta.scope, {
          ...meta.steps.FAIL,
          check: "retry_failed",
          ctx: logCtx,
          detail: {
            attempt: updated?.retryCount ?? item.retryCount + 1,
            errorMessage: message.slice(0, 500),
            maxRetry: updated?.maxRetry ?? item.maxRetry,
            phase: "retry",
            status: updated?.status ?? IC_RETRY_STATUS.WAITING,
          },
          outcome: "fail",
        });
      } else {
        logger.warn({
          actionCode: item.actionCode,
          err: err instanceof Error ? err : new Error(message),
          msg: "IC retry action failed",
          retryId: item.retryId,
          scope: "ic.job.process_retry",
          status: updated?.status,
        });
      }
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
