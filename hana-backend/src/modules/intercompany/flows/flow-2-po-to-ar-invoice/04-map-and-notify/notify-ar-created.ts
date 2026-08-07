import type { NotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import {
  formatIcArCreatedMessage,
  formatIcPartyName,
} from "@/modules/intercompany/infrastructure/ic-notification-copy";
import { formatIcDocLabel } from "@/modules/intercompany/infrastructure/ic-remarks-chain";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { ResolvePartnerResult } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.types";

export type NotifyArCreatedParams = {
  partner: ResolvePartnerResult;
  remarksTag: string;
  sourceDocEntry: string;
  sourceDocNum?: string | number | null;
  targetDocEntry: string;
  targetDocNum: string | null;
};

export const createNotifyArCreated = (
  notifications: NotificationService = createNotificationService(),
) => {
  return async (params: NotifyArCreatedParams): Promise<void> => {
    // AR owner = seller; PO owner = buyer. Full company names only.
    const sellerName = formatIcPartyName(params.partner.sellerCompany.companyName);
    const buyerName = formatIcPartyName(params.partner.buyerCompany.companyName);
    const arLabel = formatIcDocLabel({
      kind: "AR",
      docEntry: params.targetDocEntry,
      docNum: params.targetDocNum,
    });
    const poLabel = formatIcDocLabel({
      kind: "PO",
      docEntry: params.sourceDocEntry,
      docNum: params.sourceDocNum,
    });
    const message = formatIcArCreatedMessage({
      arLabel,
      buyerCompanyName: buyerName,
      poLabel,
      sellerCompanyName: sellerName,
    });

    await notifications.create({
      companyId: params.partner.sellerCompany.companyId,
      documentId: params.targetDocEntry,
      documentType: IC_OBJECT.AR_DRAFT,
      flowStep: "FLOW2_AR_DRAFT_CREATED",
      message,
      priority: "MEDIUM",
      title: sellerName || arLabel,
    });
  };
};
