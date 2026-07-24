import { randomUUID } from "node:crypto";

import { logger } from "@/core/logger/pino-logger";
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

const LOG_SCOPE = "ic.flow2";

const skipFromCapture = (capture: Extract<Flow2CaptureResult, { kind: "skip" }>): IcHookResult =>
  skipResult(capture.detail ? `${capture.reason}:${capture.detail}` : capture.reason);

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
  }): Promise<IcHookResult> => {
    const { partner, draftPayload, errorMessage, startedAt } = params;
    const durationMs = Date.now() - startedAt;

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
      }
    } catch (mapErr: unknown) {
      logger.error({
        err: mapErr instanceof Error ? mapErr : new Error(String(mapErr)),
        msg: "Flow 2 failed to persist ERROR document map",
        scope: LOG_SCOPE,
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

      logger.warn({
        errorMessage,
        msg: "Flow 2 SL failure; retry enqueued",
        retryId: item.retryId,
        scope: LOG_SCOPE,
        sourceDocEntry: partner.sourceDocEntry,
      });

      return { retryId: item.retryId, status: "queued_retry" };
    } catch (retryErr: unknown) {
      logger.error({
        err: retryErr instanceof Error ? retryErr : new Error(String(retryErr)),
        msg: "Flow 2 failed to enqueue retry",
        scope: LOG_SCOPE,
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
      const logCtx = {
        cardCode: input.cardCode,
        corrId: randomUUID(),
        dbName: input.dbName,
        docEntry: input.docEntry,
        docNum: input.docNum,
        scope: LOG_SCOPE,
      };

      try {
        const captured = await capture.capture(input);
        if (captured.kind === "skip") {
          logger.info({
            ...logCtx,
            msg: "Flow 2 skipped",
            reason: captured.reason,
          });
          return skipFromCapture(captured);
        }

        logger.info({
          ...logCtx,
          buyerCompanyId: captured.partner.buyerCompany.companyId,
          msg: "Flow 2 capture proceed",
          remarksTag: captured.remarksTag,
          sellerCompanyId: captured.partner.sellerCompany.companyId,
        });

        const draftPayload = await build.build({
          input: captured.input,
          partner: captured.partner,
          remarksTag: captured.remarksTag,
        });

        try {
          const created = await post.post({
            draftPayload,
            sellerCompanyId: captured.partner.sellerCompany.companyId,
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

          logger.info({
            ...logCtx,
            mappingId: mapping.mappingId,
            msg: "Flow 2 completed successfully",
            targetDocEntry: created.docEntry,
            targetDocNum: created.docNum,
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
          logger.error({
            ...logCtx,
            err: slErr instanceof Error ? slErr : new Error(errorMessage),
            msg: "Flow 2 AR draft post failed; PO remains created",
          });
          return handleSlFailure({
            draftPayload,
            errorMessage,
            partner: captured,
            startedAt,
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({
          ...logCtx,
          err: err instanceof Error ? err : new Error(message),
          msg: "Flow 2 unexpected failure; PO remains created",
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
