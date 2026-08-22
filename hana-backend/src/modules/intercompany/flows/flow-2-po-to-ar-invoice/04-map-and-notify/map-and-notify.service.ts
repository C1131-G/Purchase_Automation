import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { HistoryService } from "@/modules/intercompany/domain/history/history.service";
import { createHistoryService } from "@/modules/intercompany/domain/history/history.service";
import type { NotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import type { IcDocumentMap } from "@/modules/intercompany/domain/document-map/document-map.types";
import { IC_ACTION, IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import type { ResolvePartnerResult } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.types";

import { createMapPoToArInvoice } from "./map-po-to-ar-invoice";
import { createNotifyArCreated } from "./notify-ar-created";

export type MapAndNotifyService = {
  complete: (params: {
    partner: ResolvePartnerResult;
    sourceDocEntry: string;
    sourceDocNum: string | null;
    remarksTag: string;
    targetDocEntry: number;
    targetDocNum?: number;
    targetObject?: string;
    durationMs?: number;
    corrId?: string;
  }) => Promise<IcDocumentMap>;
};

export const createMapAndNotifyService = (deps?: {
  documentMap?: DocumentMapService;
  notifications?: NotificationService;
  history?: HistoryService;
}): MapAndNotifyService => {
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const notifications = deps?.notifications ?? createNotificationService();
  const history = deps?.history ?? createHistoryService();
  const mapPo = createMapPoToArInvoice(documentMap);
  const notify = createNotifyArCreated(notifications);

  return {
    complete: async (params) => {
      const targetObject = params.targetObject ?? IC_OBJECT.AR_DRAFT;
      const targetDocEntry = String(params.targetDocEntry);
      const targetDocNum =
        params.targetDocNum != null && Number.isFinite(params.targetDocNum)
          ? String(params.targetDocNum)
          : null;

      let mapping: IcDocumentMap;
      const logPhase = (check: string, message: string, completedMapping: IcDocumentMap): void => {
        icLog.info(IC_LOG_SCOPE.FLOW2, message, {
          buyerCompanyId: params.partner.buyerCompany.companyId,
          check,
          corrId: params.corrId,
          mappingId: completedMapping.mappingId,
          outcome: "pass",
          route: targetObject,
          sellerCompanyId: params.partner.sellerCompany.companyId,
          sourceDocEntry: params.sourceDocEntry,
          sourceDocNum: params.sourceDocNum,
          targetDocEntry,
          targetDocNum,
        });
      };
      if (targetObject === IC_OBJECT.AR_DRAFT) {
        mapping = await mapPo({
          partner: params.partner,
          remarksTag: params.remarksTag,
          sourceDocEntry: params.sourceDocEntry,
          sourceDocNum: params.sourceDocNum,
          targetDocEntry,
          targetDocNum,
        });
        logPhase("flow2_mapping_completed", "IC Flow 2 document mapping completed", mapping);
        await notify({
          partner: params.partner,
          remarksTag: params.remarksTag,
          sourceDocEntry: params.sourceDocEntry,
          sourceDocNum: params.sourceDocNum,
          targetDocEntry,
          targetDocNum,
        });
        logPhase(
          "flow2_notification_completed",
          "IC Flow 2 seller notification completed",
          mapping,
        );
      } else {
        const existing = await documentMap.findBySource({
          sourceCompanyId: params.partner.buyerCompany.companyId,
          sourceDocEntry: params.sourceDocEntry,
          sourceObject: IC_OBJECT.PO,
          targetObject,
        });
        mapping =
          existing && existing.status === IC_DOC_MAP_STATUS.SUCCESS
            ? existing
            : existing
              ? ((await documentMap.updateStatus(existing.mappingId, IC_DOC_MAP_STATUS.SUCCESS, {
                  errorMessage: null,
                  targetDocEntry,
                  targetDocNum,
                  targetObject,
                })) ?? existing)
              : await documentMap.create({
                  sourceCompanyId: params.partner.buyerCompany.companyId,
                  sourceDocEntry: params.sourceDocEntry,
                  sourceDocNum: params.sourceDocNum,
                  sourceObject: IC_OBJECT.PO,
                  sourceRemarksTag: params.remarksTag,
                  status: IC_DOC_MAP_STATUS.SUCCESS,
                  targetCompanyId: params.partner.sellerCompany.companyId,
                  targetDocEntry,
                  targetDocNum,
                  targetObject,
                });
        logPhase("flow2_mapping_completed", "IC Flow 2 document mapping completed", mapping);
        await notifications.create({
          companyId: params.partner.sellerCompany.companyId,
          documentId: targetDocEntry,
          documentType: targetObject,
          flowStep: "FLOW2_POS_TRANSACTION_PARKED",
          message: `Buyer PO ${params.sourceDocNum ?? params.sourceDocEntry} is ready for cashier processing in POS.`,
          priority: "MEDIUM",
          title: params.partner.sellerCompany.companyName,
        });
        logPhase(
          "flow2_notification_completed",
          "IC Flow 2 seller notification completed",
          mapping,
        );
      }

      await history.append({
        action: IC_ACTION.FLOW2_MAP_NOTIFY,
        companyId: params.partner.buyerCompany.companyId,
        documentEntry: params.sourceDocEntry,
        documentType: IC_OBJECT.PO,
        durationMs: params.durationMs ?? null,
        responseJson: JSON.stringify({
          mappingId: mapping.mappingId,
          targetDocEntry,
          targetDocNum,
          targetObject,
        }),
        status: "SUCCESS",
      });
      logPhase("flow2_history_completed", "IC Flow 2 history completed", mapping);

      return mapping;
    },
  };
};

export const mapAndNotifyService = createMapAndNotifyService();
