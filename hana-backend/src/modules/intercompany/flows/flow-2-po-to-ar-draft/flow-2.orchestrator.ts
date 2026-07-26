import { randomUUID } from "node:crypto";

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
import type { TaxMappingService } from "@/modules/intercompany/config/tax-mapping/tax-mapping.service";
import { createTaxMappingService } from "@/modules/intercompany/config/tax-mapping/tax-mapping.service";
import type { ResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import { createResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import {
  DEFAULT_MAX_RETRY,
  IC_ACTION,
  IC_CONFIG_KEY,
  IC_DOC_MAP_STATUS,
} from "@/modules/intercompany/infrastructure/constants";
import {
  FLOW2_SCOPE,
  FLOW2_STEPS,
  logFlowStep,
  summarizeIcLines,
  summarizePartner,
} from "@/modules/intercompany/infrastructure/flow-step-log";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createIcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";
import { skipResult, type IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";

import { createPoCaptureService, type PoCaptureService } from "./01-po-capture/po-capture.service";
import {
  createBuildArDraftService,
  type BuildArDraftService,
} from "./02-build-ar-invoice-draft/build-ar-draft.service";
import {
  createPostArDraftService,
  type PostArDraftService,
} from "./03-post-ar-invoice-draft/post-ar-draft.service";
import {
  createMapAndNotifyService,
  type MapAndNotifyService,
} from "./04-map-and-notify/map-and-notify.service";
import type { Flow2CaptureResult } from "./flow-2.types";

const LOG_SCOPE = FLOW2_SCOPE;

const skipFromCapture = (capture: Extract<Flow2CaptureResult, { kind: "skip" }>): IcHookResult =>
  skipResult(capture.detail ? `${capture.reason}:${capture.detail}` : capture.reason);

const summarizeDraftPayload = (draftPayload: Record<string, unknown>) => {
  const lines = Array.isArray(draftPayload.DocumentLines)
    ? (draftPayload.DocumentLines as Record<string, unknown>[])
    : [];
  const vatGroups = [
    ...new Set(
      lines
        .map((line) => (line.VatGroup == null ? "" : String(line.VatGroup)))
        .filter((code) => code.length > 0),
    ),
  ];
  const items = lines.map((line, index) => ({
    itemCode: String(line.ItemCode ?? "").trim(),
    itemDescription:
      String(line.ItemDescription ?? line.Dscription ?? line.ItemName ?? "").trim() || null,
    lineNum: line.LineNum ?? index,
    quantity: line.Quantity ?? null,
    unitPrice: line.UnitPrice ?? line.Price ?? null,
    uomCode: line.UoMCode ?? line.UomCode ?? null,
    uomEntry: line.UoMEntry ?? line.UomEntry ?? null,
    vatGroup: line.VatGroup ?? null,
    warehouseCode: line.WarehouseCode ?? null,
  }));
  return {
    cardCode: draftPayload.CardCode,
    comments: draftPayload.Comments ?? null,
    docDate: draftPayload.DocDate ?? null,
    docDueDate: draftPayload.DocDueDate ?? null,
    docObjectCode: draftPayload.DocObjectCode ?? null,
    items,
    lineCount: lines.length,
    numAtCard: draftPayload.NumAtCard ?? null,
    vatGroups,
  };
};

export type Flow2Orchestrator = {
  run: (input: IcPoHookInput) => Promise<IcHookResult>;
};

export const createFlow2Orchestrator = (deps?: {
  capture?: PoCaptureService;
  build?: BuildArDraftService;
  post?: PostArDraftService;
  mapAndNotify?: MapAndNotifyService;
  documentMap?: DocumentMapService;
  retry?: RetryService;
  history?: HistoryService;
  configuration?: ConfigurationService;
  resolvePartner?: ResolvePartnerService;
  taxMapping?: TaxMappingService;
  notifications?: NotificationService;
  documents?: IcSlDocuments;
}): Flow2Orchestrator => {
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const retry = deps?.retry ?? createRetryService();
  const history = deps?.history ?? createHistoryService();
  const configuration = deps?.configuration ?? createConfigurationService();

  const capture =
    deps?.capture ??
    createPoCaptureService({
      configuration,
      documentMap,
      resolvePartner: deps?.resolvePartner ?? createResolvePartnerService(),
    });

  const build =
    deps?.build ??
    createBuildArDraftService({
      taxMapping: deps?.taxMapping ?? createTaxMappingService(),
    });

  const post =
    deps?.post ??
    createPostArDraftService({
      documents: deps?.documents ?? createIcSlDocuments(),
    });

  const mapAndNotify =
    deps?.mapAndNotify ??
    createMapAndNotifyService({
      documentMap,
      history,
      notifications: deps?.notifications ?? createNotificationService(),
    });

  const handleSlFailure = async (params: {
    partner: Flow2CaptureResult & { kind: "proceed" };
    draftPayload: Record<string, unknown>;
    errorMessage: string;
    startedAt: number;
    logCtx: Record<string, unknown>;
  }): Promise<IcHookResult> => {
    const { partner, draftPayload, errorMessage, startedAt, logCtx } = params;
    const durationMs = Date.now() - startedAt;

    logFlowStep(LOG_SCOPE, {
      step: 7,
      total: 9,
      title: "Flow 2 post AR draft failed — recovery",
      check: "sl_post_ar_draft_fail",
      ctx: logCtx,
      detail: {
        errorMessage: errorMessage.slice(0, 2000),
        sellerCompanyId: partner.partner.sellerCompany.companyId,
        sellerSapDb: partner.partner.sellerCompany.sapDbName,
        sourceDocEntry: partner.sourceDocEntry,
      },
      outcome: "fail",
    });

    let mappingId: number | undefined;
    try {
      const existing = await documentMap.findBySource({
        sourceCompanyId: partner.partner.buyerCompany.companyId,
        sourceDocEntry: partner.sourceDocEntry,
        sourceObject: IC_OBJECT.PO,
        targetObject: IC_OBJECT.AR_DRAFT,
      });

      if (existing) {
        await documentMap.updateStatus(existing.mappingId, IC_DOC_MAP_STATUS.ERROR, {
          errorMessage: errorMessage.slice(0, 2000),
          targetObject: IC_OBJECT.AR_DRAFT,
        });
        mappingId = existing.mappingId;
        logFlowStep(LOG_SCOPE, {
          step: 8,
          total: 9,
          title: "Flow 2 document map marked ERROR",
          check: "document_map_error_update",
          ctx: logCtx,
          detail: { mappingId, status: IC_DOC_MAP_STATUS.ERROR },
          outcome: "fail",
        });
      } else {
        const created = await documentMap.create({
          errorMessage: errorMessage.slice(0, 2000),
          sourceCompanyId: partner.partner.buyerCompany.companyId,
          sourceDocEntry: partner.sourceDocEntry,
          sourceDocNum: partner.sourceDocNum,
          sourceObject: IC_OBJECT.PO,
          sourceRemarksTag: partner.remarksTag,
          status: IC_DOC_MAP_STATUS.ERROR,
          targetCompanyId: partner.partner.sellerCompany.companyId,
          targetObject: IC_OBJECT.AR_DRAFT,
        });
        mappingId = created.mappingId;
        logFlowStep(LOG_SCOPE, {
          step: 8,
          total: 9,
          title: "Flow 2 document map created as ERROR",
          check: "document_map_error_create",
          ctx: logCtx,
          detail: { mappingId, status: IC_DOC_MAP_STATUS.ERROR },
          outcome: "fail",
        });
      }
    } catch (mapErr: unknown) {
      icLog.error(LOG_SCOPE, "Flow 2 failed to persist ERROR document map", {
        ...logCtx,
        check: "document_map_error",
        err: mapErr instanceof Error ? mapErr : new Error(String(mapErr)),
        outcome: "fail",
        sourceDocEntry: partner.sourceDocEntry,
      });
    }

    try {
      await history.append({
        action: IC_ACTION.FLOW2_CREATE_AR_DRAFT,
        companyId: partner.partner.buyerCompany.companyId,
        documentEntry: partner.sourceDocEntry,
        documentType: IC_OBJECT.PO,
        durationMs,
        responseJson: JSON.stringify({ error: errorMessage.slice(0, 1000) }),
        status: "ERROR",
      });
    } catch {
      // history is best-effort
    }

    try {
      const maxRetry = await configuration.getNumber(
        IC_CONFIG_KEY.MAX_RETRY_COUNT,
        DEFAULT_MAX_RETRY,
      );
      const delayMinutes = await configuration.getNumber(IC_CONFIG_KEY.RETRY_DELAY_MINUTES, 5);
      const nextRetryAt = new Date(Date.now() + Math.max(delayMinutes, 1) * 60_000).toISOString();

      const item = await retry.enqueue({
        actionCode: IC_ACTION.FLOW2_CREATE_AR_DRAFT,
        companyId: partner.partner.buyerCompany.companyId,
        docMappingId: mappingId ?? null,
        errorMessage: errorMessage.slice(0, 2000),
        maxRetry,
        nextRetryAt,
        payloadJson: JSON.stringify({
          draftPayload,
          remarksTag: partner.remarksTag,
          sellerCompanyId: partner.partner.sellerCompany.companyId,
          sourceDocEntry: partner.sourceDocEntry,
          sourceDocNum: partner.sourceDocNum,
        }),
        sourceDocument: IC_OBJECT.PO,
        targetDocument: IC_OBJECT.AR_DRAFT,
      });

      logFlowStep(LOG_SCOPE, {
        ...FLOW2_STEPS.COMPLETE,
        check: "retry_enqueued",
        ctx: logCtx,
        detail: {
          durationMs,
          errorMessage: errorMessage.slice(0, 500),
          mappingId,
          nextRetryAt,
          retryId: item.retryId,
          status: "queued_retry",
        },
        outcome: "fail",
        title: "Flow 2 complete — SL failed, retry enqueued",
      });

      return { retryId: item.retryId, status: "queued_retry" };
    } catch (retryErr: unknown) {
      icLog.error(LOG_SCOPE, "Flow 2 failed to enqueue retry", {
        ...logCtx,
        check: "retry_enqueue",
        err: retryErr instanceof Error ? retryErr : new Error(String(retryErr)),
        outcome: "fail",
      });
      logFlowStep(LOG_SCOPE, {
        ...FLOW2_STEPS.COMPLETE,
        ctx: logCtx,
        detail: {
          durationMs,
          errorMessage: errorMessage.slice(0, 2000),
          status: "failed",
        },
        outcome: "fail",
        title: "Flow 2 complete — failed (no retry)",
      });
      return {
        historyId: undefined,
        message: errorMessage.slice(0, 2000),
        status: "failed",
      };
    }
  };

  return {
    run: async (input) => {
      const startedAt = Date.now();
      const corrId = randomUUID();
      const logCtx = {
        cardCode: input.cardCode,
        corrId,
        dbName: input.dbName,
        docEntry: input.docEntry,
        docNum: input.docNum,
        flow: "flow2" as const,
      };
      const lineSnap = summarizeIcLines(input.lines as unknown[] | undefined);

      try {
        logFlowStep(LOG_SCOPE, {
          ...FLOW2_STEPS.START,
          ctx: logCtx,
          detail: {
            hook: "afterPoCreated",
            isDraft: input.isDraft ?? false,
            sourceObject: IC_OBJECT.PO,
            targetObject: IC_OBJECT.AR_DRAFT,
          },
        });

        logFlowStep(LOG_SCOPE, {
          ...FLOW2_STEPS.INPUT,
          ctx: logCtx,
          detail: {
            currency: input.currency ?? null,
            docDate: input.docDate ?? null,
            docDueDate: input.docDueDate ?? null,
            itemCodes: lineSnap.itemCodes,
            lineCount: lineSnap.lineCount,
            lines: lineSnap.lines,
            numAtCard: input.numAtCard ?? null,
            remarks: input.remarks ?? null,
          },
        });

        logFlowStep(LOG_SCOPE, {
          ...FLOW2_STEPS.CAPTURE,
          ctx: logCtx,
          detail: { phase: "running_gates" },
        });

        const captured = await capture.capture(input);
        if (captured.kind === "skip") {
          logFlowStep(LOG_SCOPE, {
            ...FLOW2_STEPS.CAPTURE,
            check: captured.check ?? captured.reason,
            ctx: logCtx,
            detail: {
              detail: captured.detail ?? null,
              reason: captured.reason,
            },
            outcome: "skip",
            title: `Flow 2 capture skipped — ${captured.reason}`,
          });
          logFlowStep(LOG_SCOPE, {
            ...FLOW2_STEPS.COMPLETE,
            ctx: logCtx,
            detail: {
              durationMs: Date.now() - startedAt,
              reason: captured.reason,
              status: "skipped",
            },
            outcome: "skip",
            title: "Flow 2 complete — skipped",
          });
          return skipFromCapture(captured);
        }

        const partnerSnap = summarizePartner(captured.partner);
        logFlowStep(LOG_SCOPE, {
          ...FLOW2_STEPS.PARTNER,
          ctx: logCtx,
          detail: {
            ...partnerSnap,
            remarksTag: captured.remarksTag,
            sourceDocEntry: captured.sourceDocEntry,
            sourceDocNum: captured.sourceDocNum,
          },
        });

        logFlowStep(LOG_SCOPE, {
          ...FLOW2_STEPS.BUILD,
          ctx: logCtx,
          detail: {
            ...partnerSnap,
            buyerCustomerOnSeller: captured.partner.buyerCustomerCode,
            phase: "building",
            sourceLineCount: lineSnap.lineCount,
            sourceLines: lineSnap.lines,
          },
        });

        const draftPayload = await build.build({
          input: captured.input,
          partner: captured.partner,
          remarksTag: captured.remarksTag,
        });

        const draftSummary = summarizeDraftPayload(draftPayload as Record<string, unknown>);
        logFlowStep(LOG_SCOPE, {
          ...FLOW2_STEPS.BUILD,
          check: "build_ar_draft_done",
          ctx: logCtx,
          detail: {
            ...draftSummary,
            sellerCompanyId: captured.partner.sellerCompany.companyId,
            sellerSapDb: captured.partner.sellerCompany.sapDbName,
          },
          title: "Flow 2 build AR invoice draft payload — done",
        });

        logFlowStep(LOG_SCOPE, {
          ...FLOW2_STEPS.PAYLOAD,
          ctx: logCtx,
          detail: {
            draftPayload,
            items: draftSummary.items,
            sellerCompanyId: captured.partner.sellerCompany.companyId,
            sellerSapDb: captured.partner.sellerCompany.sapDbName,
          },
        });

        try {
          logFlowStep(LOG_SCOPE, {
            ...FLOW2_STEPS.POST,
            ctx: logCtx,
            detail: {
              endpoint: "/Drafts",
              lineCount: draftSummary.lineCount,
              method: "POST",
              sellerCompanyId: captured.partner.sellerCompany.companyId,
              sellerSapDb: captured.partner.sellerCompany.sapDbName,
            },
          });

          const created = await post.post({
            draftPayload,
            sellerCompanyId: captured.partner.sellerCompany.companyId,
          });

          logFlowStep(LOG_SCOPE, {
            ...FLOW2_STEPS.POST,
            check: "sl_post_ar_draft_done",
            ctx: logCtx,
            detail: {
              targetDocEntry: created.docEntry,
              targetDocNum: created.docNum ?? null,
            },
            title: "Flow 2 post AR draft to seller SAP — done",
          });

          logFlowStep(LOG_SCOPE, {
            ...FLOW2_STEPS.MAP_NOTIFY,
            ctx: logCtx,
            detail: {
              phase: "running",
              sourceDocEntry: captured.sourceDocEntry,
              targetDocEntry: created.docEntry,
              targetDocNum: created.docNum ?? null,
            },
          });

          const mapping = await mapAndNotify.complete({
            durationMs: Date.now() - startedAt,
            partner: captured.partner,
            remarksTag: captured.remarksTag,
            sourceDocEntry: captured.sourceDocEntry,
            sourceDocNum: captured.sourceDocNum,
            targetDocEntry: created.docEntry,
            targetDocNum: created.docNum,
          });

          logFlowStep(LOG_SCOPE, {
            ...FLOW2_STEPS.MAP_NOTIFY,
            check: "map_notify_done",
            ctx: logCtx,
            detail: {
              mappingId: mapping.mappingId,
              mappingStatus: mapping.status,
              targetDocEntry: created.docEntry,
              targetDocNum: created.docNum ?? null,
            },
            title: "Flow 2 document map + notify — done",
          });

          logFlowStep(LOG_SCOPE, {
            ...FLOW2_STEPS.COMPLETE,
            ctx: logCtx,
            detail: {
              durationMs: Date.now() - startedAt,
              mappingId: mapping.mappingId,
              status: "success",
              targetDocEntry: created.docEntry,
              targetDocNum: created.docNum ?? null,
              ...partnerSnap,
              items: draftSummary.items,
            },
          });

          return {
            mappingId: mapping.mappingId,
            status: "success",
            targetDoc: {
              entry: created.docEntry,
              num: created.docNum,
              type: IC_OBJECT.AR_DRAFT,
            },
          };
        } catch (slErr: unknown) {
          const errorMessage = slErr instanceof Error ? slErr.message : String(slErr);
          icLog.error(LOG_SCOPE, "Flow 2 AR draft post failed; PO remains created", {
            ...logCtx,
            check: "sl_post_ar_draft",
            err: slErr instanceof Error ? slErr : new Error(errorMessage),
            items: draftSummary.items,
            outcome: "fail",
            sellerCompanyId: captured.partner.sellerCompany.companyId,
            sellerSapDb: captured.partner.sellerCompany.sapDbName,
          });
          return handleSlFailure({
            draftPayload,
            errorMessage,
            logCtx,
            partner: captured,
            startedAt,
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logFlowStep(LOG_SCOPE, {
          ...FLOW2_STEPS.COMPLETE,
          ctx: logCtx,
          detail: {
            durationMs: Date.now() - startedAt,
            error: message.slice(0, 2000),
            status: "failed",
          },
          outcome: "fail",
          title: "Flow 2 complete — failed (PO remains created)",
        });
        icLog.error(IC_LOG_SCOPE.FLOW2, "Flow 2 unexpected failure; PO remains created", {
          ...logCtx,
          check: "unexpected",
          err: err instanceof Error ? err : new Error(message),
          outcome: "fail",
        });
        return {
          message: message.slice(0, 2000),
          status: "failed",
        };
      }
    },
  };
};

export const flow2Orchestrator = createFlow2Orchestrator();

export const runFlow2 = (input: IcPoHookInput): Promise<IcHookResult> =>
  flow2Orchestrator.run(input);
