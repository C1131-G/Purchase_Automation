import { randomUUID } from "node:crypto";

import type { ConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { HistoryService } from "@/modules/intercompany/domain/history/history.service";
import { createHistoryService } from "@/modules/intercompany/domain/history/history.service";
import type { NotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import type { ResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import { createResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import {
  FLOW1_SCOPE,
  FLOW1_STEPS,
  logFlowStep,
  summarizeIcLines,
  summarizePartner,
} from "@/modules/intercompany/infrastructure/flow-step-log";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { IcPqDraftHookInput } from "@/modules/intercompany/flows/shared/flow.types";
import { skipResult, type IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";

import { createPqCaptureService, type PqCaptureService } from "./01-pq-capture/pq-capture.service";
import type {
  MapSourceItemsToPartnerInput,
  PartnerItemMapEntry,
} from "@/modules/intercompany/config/item-mapping/partner-item.mapping";

import { createCreateRfqService, type CreateRfqService } from "./02-create-rfq/create-rfq.service";
import {
  createNotifySellerService,
  type NotifySellerService,
} from "./03-notify-seller/notify-seller.service";
import type { Flow1CaptureResult } from "./flow-1.types";

const LOG_SCOPE = FLOW1_SCOPE;

const skipFromCapture = (capture: Extract<Flow1CaptureResult, { kind: "skip" }>): IcHookResult =>
  skipResult(capture.detail ? `${capture.reason}:${capture.detail}` : capture.reason);

export type Flow1Orchestrator = {
  run: (input: IcPqDraftHookInput) => Promise<IcHookResult>;
};

export const createFlow1Orchestrator = (deps?: {
  capture?: PqCaptureService;
  createRfq?: CreateRfqService;
  notify?: NotifySellerService;
  configuration?: ConfigurationService;
  resolvePartner?: ResolvePartnerService;
  documentMap?: DocumentMapService;
  rfq?: RfqService;
  notifications?: NotificationService;
  history?: HistoryService;
  /** Injectable OSCN map for create RFQ (see createCreateRfqService). */
  mapItems?: (input: MapSourceItemsToPartnerInput) => Promise<Map<string, PartnerItemMapEntry>>;
}): Flow1Orchestrator => {
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const rfq = deps?.rfq ?? createRfqService();
  const notifications = deps?.notifications ?? createNotificationService();
  const history = deps?.history ?? createHistoryService();
  const configuration = deps?.configuration ?? createConfigurationService();

  const capture =
    deps?.capture ??
    createPqCaptureService({
      configuration,
      documentMap,
      resolvePartner: deps?.resolvePartner ?? createResolvePartnerService(),
      rfq,
    });

  const createRfq =
    deps?.createRfq ??
    createCreateRfqService({
      documentMap,
      rfq,
      mapItems: deps?.mapItems,
    });

  const notify =
    deps?.notify ??
    createNotifySellerService({
      history,
      notifications,
    });

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
        flow: "flow1" as const,
      };
      const lineSnap = summarizeIcLines(input.lines as unknown[] | undefined);

      try {
        logFlowStep(LOG_SCOPE, {
          ...FLOW1_STEPS.START,
          ctx: logCtx,
          detail: {
            hook: "afterPqSaved",
            sourceObject: IC_OBJECT.PQ,
            targetObject: IC_OBJECT.RFQ,
          },
        });

        logFlowStep(LOG_SCOPE, {
          ...FLOW1_STEPS.INPUT,
          ctx: logCtx,
          detail: {
            address: input.address ?? null,
            buyerHint: input.salesPersonCode ?? null,
            comments: input.comments ?? null,
            docDate: input.docDate ?? null,
            docDueDate: input.docDueDate ?? null,
            itemCodes: lineSnap.itemCodes,
            lineCount: lineSnap.lineCount,
            lines: lineSnap.lines,
            numAtCard: input.numAtCard ?? null,
            requiredDate: input.requiredDate ?? null,
          },
        });

        logFlowStep(LOG_SCOPE, {
          ...FLOW1_STEPS.CAPTURE,
          ctx: logCtx,
          detail: { phase: "running_gates" },
        });

        const captured = await capture.capture(input);
        if (captured.kind === "skip") {
          logFlowStep(LOG_SCOPE, {
            ...FLOW1_STEPS.CAPTURE,
            check: captured.check ?? captured.reason,
            ctx: logCtx,
            detail: {
              detail: captured.detail ?? null,
              reason: captured.reason,
            },
            outcome: "skip",
            title: `Flow 1 capture skipped — ${captured.reason}`,
          });
          logFlowStep(LOG_SCOPE, {
            ...FLOW1_STEPS.COMPLETE,
            ctx: logCtx,
            detail: {
              durationMs: Date.now() - startedAt,
              reason: captured.reason,
              status: "skipped",
            },
            outcome: "skip",
            title: "Flow 1 complete — skipped",
          });
          return skipFromCapture(captured);
        }

        const partnerSnap = summarizePartner(captured.partner);
        logFlowStep(LOG_SCOPE, {
          ...FLOW1_STEPS.PARTNER,
          ctx: logCtx,
          detail: {
            ...partnerSnap,
            remarksTag: captured.remarksTag,
            sourceDocEntry: captured.sourceDocEntry,
            sourceDocNum: captured.sourceDocNum,
          },
        });

        logFlowStep(LOG_SCOPE, {
          ...FLOW1_STEPS.CREATE_RFQ,
          ctx: logCtx,
          detail: {
            ...partnerSnap,
            lineCount: lineSnap.lineCount,
            lines: lineSnap.lines,
            remarksTag: captured.remarksTag,
            sourceDocEntry: captured.sourceDocEntry,
            sourceDocNum: captured.sourceDocNum,
            vendorCode: captured.partner.vendorCode,
          },
        });

        const created = await createRfq.create({
          cardName: input.cardName ?? null,
          existingRemarks: input.comments ?? null,
          lines: input.lines,
          partner: captured.partner,
          remarksTag: captured.remarksTag,
          sourceDocEntry: captured.sourceDocEntry,
          sourceDocNum: captured.sourceDocNum,
        });

        logFlowStep(LOG_SCOPE, {
          ...FLOW1_STEPS.RFQ_RESULT,
          ctx: logCtx,
          detail: {
            created: created.created,
            mappingId: created.mappingId,
            rfqId: created.rfq.rfqId,
            rfqLineCount: created.rfq.lines?.length ?? 0,
            rfqLines: (created.rfq.lines ?? []).map((line) => ({
              description: line.description,
              itemCode: line.itemCode,
              lineNum: line.lineNum,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              warehouse: line.warehouse,
            })),
            rfqNumber: created.rfq.rfqNumber,
            rfqStatus: created.rfq.status,
            sourceCompanyId: created.rfq.sourceCompanyId,
            targetCompanyId: created.rfq.targetCompanyId,
            vendorCode: created.rfq.vendorCode,
          },
        });

        if (created.created) {
          logFlowStep(LOG_SCOPE, {
            ...FLOW1_STEPS.NOTIFY,
            ctx: logCtx,
            detail: {
              notifyCompanyId: captured.partner.sellerCompany.companyId,
              notifyCompanyName: captured.partner.sellerCompany.companyName,
              rfqId: created.rfq.rfqId,
              rfqNumber: created.rfq.rfqNumber,
            },
          });
          await notify.notifyRfqCreated({
            durationMs: Date.now() - startedAt,
            partner: captured.partner,
            remarksTag: captured.remarksTag,
            rfq: created.rfq,
            sourceDocEntry: captured.sourceDocEntry,
          });
          logFlowStep(LOG_SCOPE, {
            ...FLOW1_STEPS.NOTIFY,
            check: "notify_seller_done",
            ctx: logCtx,
            detail: {
              notified: true,
              sellerCompanyId: captured.partner.sellerCompany.companyId,
            },
            title: "Flow 1 — notify seller company — done",
          });
        } else {
          logFlowStep(LOG_SCOPE, {
            ...FLOW1_STEPS.NOTIFY,
            check: "notify_skipped_existing",
            ctx: logCtx,
            detail: {
              created: false,
              mappingId: created.mappingId,
              rfqId: created.rfq.rfqId,
              reason: "rfq_already_existed_idempotent",
            },
            outcome: "pass",
            title: "Flow 1 — notify skipped — RFQ already existed",
          });
        }

        logFlowStep(LOG_SCOPE, {
          ...FLOW1_STEPS.COMPLETE,
          ctx: logCtx,
          detail: {
            created: created.created,
            durationMs: Date.now() - startedAt,
            mappingId: created.mappingId,
            rfqId: created.rfq.rfqId,
            rfqNumber: created.rfq.rfqNumber,
            status: "success",
            ...partnerSnap,
          },
        });

        return {
          mappingId: created.mappingId || undefined,
          status: "success",
          targetDoc: {
            entry: created.rfq.rfqId,
            num: undefined,
            type: IC_OBJECT.RFQ,
          },
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logFlowStep(LOG_SCOPE, {
          ...FLOW1_STEPS.COMPLETE,
          ctx: logCtx,
          detail: {
            durationMs: Date.now() - startedAt,
            error: message.slice(0, 2000),
            status: "failed",
          },
          outcome: "fail",
          title: "Flow 1 complete — failed (buyer PQ remains saved)",
        });
        icLog.error(IC_LOG_SCOPE.FLOW1, "Flow 1 unexpected failure; buyer PQ remains saved", {
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

export const flow1Orchestrator = createFlow1Orchestrator();

export const runFlow1 = (input: IcPqDraftHookInput): Promise<IcHookResult> =>
  flow1Orchestrator.run(input);
