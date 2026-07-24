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
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import type { ResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import { createResolvePartnerService } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.service";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { IcPqDraftHookInput } from "@/modules/intercompany/flows/shared/flow.types";
import { skipResult, type IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";

import {
  createPqDraftCaptureService,
  type PqDraftCaptureService,
} from "./01-pq-draft-capture/pq-draft-capture.service";
import { createCreateRfqService, type CreateRfqService } from "./02-create-rfq/create-rfq.service";
import {
  createNotifySellerService,
  type NotifySellerService,
} from "./03-notify-seller/notify-seller.service";
import type { Flow1CaptureResult } from "./flow-1.types";

const LOG_SCOPE = "ic.flow1";

const skipFromCapture = (capture: Extract<Flow1CaptureResult, { kind: "skip" }>): IcHookResult =>
  skipResult(capture.detail ? `${capture.reason}:${capture.detail}` : capture.reason);

export type Flow1Orchestrator = {
  run: (input: IcPqDraftHookInput) => Promise<IcHookResult>;
};

export const createFlow1Orchestrator = (deps?: {
  capture?: PqDraftCaptureService;
  createRfq?: CreateRfqService;
  notify?: NotifySellerService;
  configuration?: ConfigurationService;
  resolvePartner?: ResolvePartnerService;
  documentMap?: DocumentMapService;
  rfq?: RfqService;
  notifications?: NotificationService;
  history?: HistoryService;
}): Flow1Orchestrator => {
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const rfq = deps?.rfq ?? createRfqService();
  const notifications = deps?.notifications ?? createNotificationService();
  const history = deps?.history ?? createHistoryService();
  const configuration = deps?.configuration ?? createConfigurationService();

  const capture =
    deps?.capture ??
    createPqDraftCaptureService({
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
            msg: "Flow 1 skipped",
            reason: captured.reason,
          });
          return skipFromCapture(captured);
        }

        logger.info({
          ...logCtx,
          buyerCompanyId: captured.partner.buyerCompany.companyId,
          msg: "Flow 1 capture proceed",
          remarksTag: captured.remarksTag,
          sellerCompanyId: captured.partner.sellerCompany.companyId,
        });

        const created = await createRfq.create({
          lines: input.lines,
          partner: captured.partner,
          remarksTag: captured.remarksTag,
          sourceDocEntry: captured.sourceDocEntry,
          sourceDocNum: captured.sourceDocNum,
        });

        if (created.created) {
          await notify.notifyRfqCreated({
            durationMs: Date.now() - startedAt,
            partner: captured.partner,
            remarksTag: captured.remarksTag,
            rfq: created.rfq,
            sourceDocEntry: captured.sourceDocEntry,
          });
        }

        logger.info({
          ...logCtx,
          created: created.created,
          mappingId: created.mappingId,
          msg: "Flow 1 RFQ path complete",
          rfqId: created.rfq.rfqId,
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
        logger.error({
          ...logCtx,
          err: err instanceof Error ? err : new Error(message),
          msg: "Flow 1 unexpected failure; PQ draft remains saved",
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
