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

import {
  mapSourceItemsToPartnerItems,
  type MapSourceItemsToPartnerInput,
  type PartnerItemMapEntry,
} from "@/modules/intercompany/config/item-mapping/partner-item.mapping";
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
import { formatIcDocLabel } from "@/modules/intercompany/infrastructure/ic-remarks-chain";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createIcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";
import { skipResult, type IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";

import { createPoCaptureService, type PoCaptureService } from "./01-po-capture/po-capture.service";
import {
  createBuildArInvoiceService,
  type BuildArInvoiceService,
} from "./02-build-ar-invoice/build-ar-invoice.service";
import {
  createPostArInvoiceService,
  type PostArInvoiceService,
} from "./03-post-ar-invoice/post-ar-invoice.service";
import {
  createMapAndNotifyService,
  type MapAndNotifyService,
} from "./04-map-and-notify/map-and-notify.service";
import type { Flow2CaptureResult } from "./flow-2.types";
import {
  createParkTransactionService,
  type ParkTransactionService,
} from "./03-park-transaction/park-transaction.service";

const LOG_SCOPE = FLOW2_SCOPE;

const skipFromCapture = (capture: Extract<Flow2CaptureResult, { kind: "skip" }>): IcHookResult =>
  skipResult(capture.detail ? `${capture.reason}:${capture.detail}` : capture.reason);

const compactLogRow = (row: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== null && value !== undefined && value !== "") {
      out[key] = value;
    }
  }
  return out;
};

const summarizeArInvoicePayload = (arInvoicePayload: Record<string, unknown>) => {
  const lines = Array.isArray(arInvoicePayload.DocumentLines)
    ? (arInvoicePayload.DocumentLines as Record<string, unknown>[])
    : [];
  const vatGroups = [
    ...new Set(
      lines
        .map((line) => (line.VatGroup == null ? "" : String(line.VatGroup)))
        .filter((code) => code.length > 0),
    ),
  ];
  const items = lines.map((line, index) => {
    const itemDescription = String(
      line.ItemDescription ?? line.Dscription ?? line.ItemName ?? "",
    ).trim();
    const uomCode = line.UoMCode ?? line.UomCode;
    const uomEntry = line.UoMEntry ?? line.UomEntry;
    return compactLogRow({
      // SQ convert: BaseType 23 + BaseEntry/BaseLine (item/tax/UoM from base SQ in SAP).
      baseEntry: line.BaseEntry,
      baseLine: line.BaseLine,
      baseType: line.BaseType,
      arTaxCode: line.VatGroup == null ? undefined : String(line.VatGroup),
      itemCode: String(line.ItemCode ?? "").trim() || undefined,
      itemDescription: itemDescription || undefined,
      lineNum: line.LineNum ?? index,
      quantity: line.Quantity,
      unitPrice: line.UnitPrice ?? line.Price,
      uomCode: uomCode == null || String(uomCode).trim() === "" ? undefined : uomCode,
      uomEntry:
        uomEntry == null || !Number.isFinite(Number(uomEntry)) || Number(uomEntry) <= 0
          ? undefined
          : uomEntry,
      vatGroup: line.VatGroup,
      warehouseCode: line.WarehouseCode,
    });
  });
  const baseTypes = [
    ...new Set(
      lines
        .map((line) => (line.BaseType == null ? "" : String(line.BaseType)))
        .filter((code) => code.length > 0),
    ),
  ];
  return compactLogRow({
    cardCode: arInvoicePayload.CardCode,
    comments: arInvoicePayload.Comments,
    docDate: arInvoicePayload.DocDate,
    docDueDate: arInvoicePayload.DocDueDate,
    docObjectCode: arInvoicePayload.DocObjectCode,
    items,
    lineCount: lines.length,
    numAtCard: arInvoicePayload.NumAtCard,
    // SQ convert markers (23 = Sales Quotation).
    baseTypes: baseTypes.length > 0 ? baseTypes : undefined,
    // Distinct AR tax codes on this draft (usually empty on convert — from base SQ).
    arTaxCodes: vatGroups.length > 0 ? vatGroups : undefined,
    vatGroups: vatGroups.length > 0 ? vatGroups : undefined,
  });
};

export type Flow2Orchestrator = {
  run: (input: IcPoHookInput) => Promise<IcHookResult>;
};

export const createFlow2Orchestrator = (deps?: {
  capture?: PoCaptureService;
  build?: BuildArInvoiceService;
  post?: PostArInvoiceService;
  mapAndNotify?: MapAndNotifyService;
  documentMap?: DocumentMapService;
  retry?: RetryService;
  history?: HistoryService;
  configuration?: ConfigurationService;
  resolvePartner?: ResolvePartnerService;
  notifications?: NotificationService;
  documents?: IcSlDocuments;
  park?: ParkTransactionService;
  /** Injectable OSCN item map (default: real HANA OSCN → partner OITM). */
  mapItems?: (input: MapSourceItemsToPartnerInput) => Promise<Map<string, PartnerItemMapEntry>>;
}): Flow2Orchestrator => {
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const retry = deps?.retry ?? createRetryService();
  const history = deps?.history ?? createHistoryService();
  const configuration = deps?.configuration ?? createConfigurationService();
  const mapItems = deps?.mapItems ?? mapSourceItemsToPartnerItems;

  const capture =
    deps?.capture ??
    createPoCaptureService({
      configuration,
      documentMap,
      resolvePartner: deps?.resolvePartner ?? createResolvePartnerService(),
    });

  const documents = deps?.documents ?? createIcSlDocuments();

  const build =
    deps?.build ??
    createBuildArInvoiceService({
      documentMap,
      documents,
    });

  const post =
    deps?.post ??
    createPostArInvoiceService({
      documents,
    });
  const park = deps?.park ?? createParkTransactionService();

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
      title: "Flow 2 post AR invoice draft failed — recovery",
      check: "sl_post_ar_invoice_draft_fail",
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
      const existing =
        (await documentMap.findBySource({
          sourceCompanyId: partner.partner.buyerCompany.companyId,
          sourceDocEntry: partner.sourceDocEntry,
          sourceObject: IC_OBJECT.PO,
          targetObject: IC_OBJECT.AR_DRAFT,
        })) ??
        (await documentMap.findBySource({
          sourceCompanyId: partner.partner.buyerCompany.companyId,
          sourceDocEntry: partner.sourceDocEntry,
          sourceObject: IC_OBJECT.PO,
          targetObject: IC_OBJECT.AR_INVOICE,
        }));

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
          // Prefer arInvoiceDraftPayload; arInvoicePayload/draftPayload kept for older retry workers.
          arInvoiceDraftPayload: draftPayload,
          arInvoicePayload: draftPayload,
          draftPayload,
          remarksTag: partner.remarksTag,
          sellerCompanyId: partner.partner.sellerCompany.companyId,
          sourceDocEntry: partner.sourceDocEntry,
          sourceDocNum: partner.sourceDocNum,
        }),
        sourceDocument: formatIcDocLabel({
          kind: "PO",
          docEntry: partner.sourceDocEntry,
          docNum: partner.sourceDocNum,
        }),
        targetDocument: formatIcDocLabel({ kind: "AR" }),
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

  const handleParkFailure = async (params: {
    captured: Extract<Flow2CaptureResult, { kind: "proceed" }>;
    errorMessage: string;
    parkInput: Parameters<ParkTransactionService["park"]>[0];
    startedAt: number;
  }): Promise<IcHookResult> => {
    const { captured, errorMessage, parkInput, startedAt } = params;
    let mappingId: number | undefined;
    const existing = await documentMap.findBySource({
      sourceCompanyId: captured.partner.buyerCompany.companyId,
      sourceDocEntry: captured.sourceDocEntry,
      sourceObject: IC_OBJECT.PO,
      targetObject: IC_OBJECT.PARKED_TRANSACTION,
    });
    if (existing) {
      await documentMap.updateStatus(existing.mappingId, IC_DOC_MAP_STATUS.ERROR, {
        errorMessage: errorMessage.slice(0, 2000),
        targetObject: IC_OBJECT.PARKED_TRANSACTION,
      });
      mappingId = existing.mappingId;
    } else {
      const created = await documentMap.create({
        errorMessage: errorMessage.slice(0, 2000),
        sourceCompanyId: captured.partner.buyerCompany.companyId,
        sourceDocEntry: captured.sourceDocEntry,
        sourceDocNum: captured.sourceDocNum,
        sourceObject: IC_OBJECT.PO,
        sourceRemarksTag: captured.remarksTag,
        status: IC_DOC_MAP_STATUS.ERROR,
        targetCompanyId: captured.partner.sellerCompany.companyId,
        targetObject: IC_OBJECT.PARKED_TRANSACTION,
      });
      mappingId = created.mappingId;
    }

    try {
      await history.append({
        action: IC_ACTION.FLOW2_CREATE_PARKED_TRANSACTION,
        companyId: captured.partner.buyerCompany.companyId,
        documentEntry: captured.sourceDocEntry,
        documentType: IC_OBJECT.PO,
        durationMs: Date.now() - startedAt,
        responseJson: JSON.stringify({ error: errorMessage.slice(0, 1000) }),
        status: "ERROR",
      });
    } catch {
      // history is best-effort
    }

    const maxRetry = await configuration.getNumber(
      IC_CONFIG_KEY.MAX_RETRY_COUNT,
      DEFAULT_MAX_RETRY,
    );
    const delayMinutes = await configuration.getNumber(IC_CONFIG_KEY.RETRY_DELAY_MINUTES, 5);
    const retryItem = await retry.enqueue({
      actionCode: IC_ACTION.FLOW2_CREATE_PARKED_TRANSACTION,
      companyId: captured.partner.buyerCompany.companyId,
      docMappingId: mappingId ?? null,
      errorMessage: errorMessage.slice(0, 2000),
      maxRetry,
      nextRetryAt: new Date(Date.now() + Math.max(delayMinutes, 1) * 60_000).toISOString(),
      payloadJson: JSON.stringify({ parkInput }),
      sourceDocument: formatIcDocLabel({
        kind: "PO",
        docEntry: captured.sourceDocEntry,
        docNum: captured.sourceDocNum,
      }),
      targetDocument: IC_OBJECT.PARKED_TRANSACTION,
    });
    return { retryId: retryItem.retryId, status: "queued_retry" };
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
            route: "UNRESOLVED",
            sourceObject: IC_OBJECT.PO,
          },
        });

        logFlowStep(LOG_SCOPE, {
          ...FLOW2_STEPS.INPUT,
          ctx: logCtx,
          detail: compactLogRow({
            currency: input.currency,
            docDate: input.docDate,
            docDueDate: input.docDueDate,
            itemCodes: lineSnap.itemCodes,
            lineCount: lineSnap.lineCount,
            lines: lineSnap.lines,
            numAtCard: input.numAtCard,
            remarks: input.remarks,
          }),
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

        const isParkedRoute = captured.deliveryRoute === IC_OBJECT.PARKED_TRANSACTION;

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

        // Validate PO ItemCodes map via OSCN.Substitute → seller OITM (fail → retry queue).
        // AR draft converts from seller SQ (already partner codes); this gates master-data completeness.
        const partnerItemMap = await mapItems({
          itemCodes: lineSnap.itemCodes,
          partnerCardCode: captured.partner.vendorCode,
          sourceDbName: captured.partner.buyerCompany.sapDbName,
          targetDbName: captured.partner.sellerCompany.sapDbName,
        });
        logFlowStep(LOG_SCOPE, {
          ...FLOW2_STEPS.BUILD,
          check: "oscn_item_map_ok",
          ctx: logCtx,
          detail: {
            mappedCount: partnerItemMap.size,
            mappings: [...partnerItemMap.values()].map((entry) => ({
              partnerItemCode: entry.partnerItemCode,
              sourceItemCode: entry.sourceItemCode,
            })),
            phase: "oscn_item_map",
          },
          title: "Flow 2 OSCN item map (buyer → seller) — ok",
        });

        logFlowStep(LOG_SCOPE, {
          ...FLOW2_STEPS.BUILD,
          ctx: logCtx,
          detail: {
            buyerCustomerOnSeller: captured.partner.buyerCustomerCode,
            phase: "building",
            sellerCompanyId: captured.partner.sellerCompany.companyId,
            sellerSapDb: captured.partner.sellerCompany.sapDbName,
            sourceLineCount: lineSnap.lineCount,
            sourceLines: lineSnap.lines,
          },
          title: isParkedRoute
            ? "Flow 2 build parked transaction source data — started"
            : "Flow 2 build AR invoice draft payload — started",
        });

        const buildResult = await build.build({
          input: captured.input,
          partner: captured.partner,
          remarksTag: captured.remarksTag,
        });
        const { draftPayload, salesQuotation } = buildResult;
        const parkedSalesQuotation =
          isParkedRoute && draftPayload.SalesPersonCode != null
            ? { ...salesQuotation, salesPersonCode: draftPayload.SalesPersonCode }
            : salesQuotation;

        const arInvoiceSummary = summarizeArInvoicePayload(draftPayload as Record<string, unknown>);
        logFlowStep(LOG_SCOPE, {
          ...FLOW2_STEPS.BUILD,
          check: isParkedRoute ? "build_parked_source_data_done" : "build_ar_invoice_draft_done",
          ctx: logCtx,
          detail: {
            ...arInvoiceSummary,
            sellerCompanyId: captured.partner.sellerCompany.companyId,
            sellerSapDb: captured.partner.sellerCompany.sapDbName,
          },
          title: isParkedRoute
            ? "Flow 2 build parked transaction source data — done"
            : "Flow 2 build AR invoice draft payload — done",
        });

        try {
          if (captured.deliveryRoute === IC_OBJECT.PARKED_TRANSACTION) {
            const transactionId = `IC-PO-${captured.partner.buyerCompany.companyId}-${captured.sourceDocEntry}`;
            const parkInput = {
              buyerCompanyId: captured.partner.buyerCompany.companyId,
              buyerCompanyName: captured.partner.buyerCompany.companyName,
              corrId,
              customerCode: captured.partner.buyerCustomerCode,
              poDocEntry: input.docEntry,
              poDocNum: input.docNum,
              portalCreatedBy: input.portalCreatedBy,
              salesPersonCode: undefined,
              sellerDbName: captured.partner.sellerCompany.sapDbName,
              sellerCompanyId: captured.partner.sellerCompany.companyId,
              snapshot: parkedSalesQuotation,
              sourceDocEntry: captured.sourceDocEntry,
              transactionId,
            };
            logFlowStep(LOG_SCOPE, {
              ...FLOW2_STEPS.POST,
              check: "flow2_delivery_route",
              ctx: logCtx,
              detail: {
                route: IC_OBJECT.PARKED_TRANSACTION,
                sellerCompanyId: captured.partner.sellerCompany.companyId,
                sqDocEntry: salesQuotation.docEntry,
                transactionId,
              },
              title: "Flow 2 route seller SQ to POS parked transaction",
            });
            let parked;
            try {
              parked = await park.park(parkInput);
            } catch (parkError: unknown) {
              const errorMessage =
                parkError instanceof Error ? parkError.message : String(parkError);
              icLog.error(LOG_SCOPE, "Flow 2 POS parking failed; PO remains created", {
                ...logCtx,
                check: "parked_transaction_create",
                err: parkError instanceof Error ? parkError : new Error(errorMessage),
                outcome: "fail",
                sellerCompanyId: captured.partner.sellerCompany.companyId,
                transactionId,
              });
              return handleParkFailure({ captured, errorMessage, parkInput, startedAt });
            }
            const mapping = await mapAndNotify.complete({
              corrId,
              durationMs: Date.now() - startedAt,
              partner: captured.partner,
              remarksTag: captured.remarksTag,
              sourceDocEntry: captured.sourceDocEntry,
              sourceDocNum: captured.sourceDocNum,
              targetDocEntry: parked.parkedTransactionId,
              targetObject: IC_OBJECT.PARKED_TRANSACTION,
            });
            logFlowStep(LOG_SCOPE, {
              ...FLOW2_STEPS.COMPLETE,
              check: parked.reused ? "parked_transaction_reused" : "parked_transaction_created",
              ctx: logCtx,
              detail: {
                durationMs: Date.now() - startedAt,
                mappingId: mapping.mappingId,
                parkedTransactionId: parked.parkedTransactionId,
                route: IC_OBJECT.PARKED_TRANSACTION,
                status: "success",
                transactionId,
              },
              title: "Flow 2 complete — POS transaction parked",
            });
            return {
              mappingId: mapping.mappingId,
              status: "success",
              targetDoc: {
                entry: parked.parkedTransactionId,
                type: IC_OBJECT.PARKED_TRANSACTION,
              },
            };
          }

          logFlowStep(LOG_SCOPE, {
            ...FLOW2_STEPS.POST,
            check: "flow2_delivery_route",
            ctx: logCtx,
            detail: { route: IC_OBJECT.AR_DRAFT },
            title: "Flow 2 route seller SQ to A/R invoice draft",
          });
          // The SAP draft request is safe to trace only on the draft route. The
          // parked route logs identifiers and context, never its full POS JSON.
          logFlowStep(LOG_SCOPE, {
            ...FLOW2_STEPS.PAYLOAD,
            ctx: logCtx,
            detail: {
              arInvoiceDraftPayload: draftPayload,
              sellerCompanyId: captured.partner.sellerCompany.companyId,
              sellerSapDb: captured.partner.sellerCompany.sapDbName,
            },
          });
          logFlowStep(LOG_SCOPE, {
            ...FLOW2_STEPS.POST,
            ctx: logCtx,
            detail: {
              endpoint: "/Drafts",
              docObjectCode: "13",
              lineCount: arInvoiceSummary.lineCount,
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
            check: "sl_post_ar_invoice_draft_done",
            ctx: logCtx,
            detail: {
              targetDocEntry: created.docEntry,
              targetDocNum: created.docNum ?? null,
            },
            title: "Flow 2 post AR invoice draft to seller SAP — done",
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
            corrId,
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
            check: "map_notify_ar_draft_done",
            ctx: logCtx,
            detail: {
              mappingId: mapping.mappingId,
              mappingStatus: mapping.status,
              targetDocEntry: created.docEntry,
              targetDocNum: created.docNum ?? null,
              targetObject: IC_OBJECT.AR_DRAFT,
            },
            title: "Flow 2 document map + notify AR invoice draft — done",
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
              buyerCustomerCode: partnerSnap.buyerCustomerCode,
              sellerCompanyId: partnerSnap.sellerCompanyId,
              sellerSapDb: partnerSnap.sellerSapDb,
              vendorCode: partnerSnap.vendorCode,
              vatGroups: arInvoiceSummary.vatGroups,
              items: arInvoiceSummary.items,
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
          if (captured.deliveryRoute === IC_OBJECT.PARKED_TRANSACTION) {
            const transactionId = `IC-PO-${captured.partner.buyerCompany.companyId}-${captured.sourceDocEntry}`;
            return handleParkFailure({
              captured,
              errorMessage,
              parkInput: {
                buyerCompanyId: captured.partner.buyerCompany.companyId,
                buyerCompanyName: captured.partner.buyerCompany.companyName,
                corrId,
                customerCode: captured.partner.buyerCustomerCode,
                poDocEntry: input.docEntry,
                poDocNum: input.docNum,
                portalCreatedBy: input.portalCreatedBy,
                salesPersonCode: undefined,
                sellerDbName: captured.partner.sellerCompany.sapDbName,
                sellerCompanyId: captured.partner.sellerCompany.companyId,
                snapshot: parkedSalesQuotation,
                sourceDocEntry: captured.sourceDocEntry,
                transactionId,
              },
              startedAt,
            });
          }
          icLog.error(LOG_SCOPE, "Flow 2 AR invoice draft post failed; PO remains created", {
            ...logCtx,
            check: "sl_post_ar_invoice_draft",
            err: slErr instanceof Error ? slErr : new Error(errorMessage),
            items: arInvoiceSummary.items,
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
