import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { HistoryService } from "@/modules/intercompany/domain/history/history.service";
import { createHistoryService } from "@/modules/intercompany/domain/history/history.service";
import type { NotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import type { IcDocumentMap } from "@/modules/intercompany/domain/document-map/document-map.types";
import { IC_ACTION } from "@/modules/intercompany/infrastructure/constants";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { ResolvePartnerResult } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.types";

import { createMapPoToArDraft } from "./map-po-to-ar-draft";
import { createNotifyArCreated } from "./notify-ar-created";

export type MapAndNotifyService = {
  complete: (params: {
    partner: ResolvePartnerResult;
    sourceDocEntry: string;
    sourceDocNum: string | null;
    remarksTag: string;
    targetDocEntry: number;
    targetDocNum?: number;
    durationMs?: number;
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
  const mapPo = createMapPoToArDraft(documentMap);
  const notify = createNotifyArCreated(notifications);

  return {
    complete: async (params) => {
      const targetDocEntry = String(params.targetDocEntry);
      const targetDocNum =
        params.targetDocNum != null && Number.isFinite(params.targetDocNum)
          ? String(params.targetDocNum)
          : null;

      const mapping = await mapPo({
        partner: params.partner,
        remarksTag: params.remarksTag,
        sourceDocEntry: params.sourceDocEntry,
        sourceDocNum: params.sourceDocNum,
        targetDocEntry,
        targetDocNum,
      });

      await notify({
        partner: params.partner,
        remarksTag: params.remarksTag,
        sourceDocEntry: params.sourceDocEntry,
        targetDocEntry,
        targetDocNum,
      });

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
        }),
        status: "SUCCESS",
      });

      return mapping;
    },
  };
};

export const mapAndNotifyService = createMapAndNotifyService();
