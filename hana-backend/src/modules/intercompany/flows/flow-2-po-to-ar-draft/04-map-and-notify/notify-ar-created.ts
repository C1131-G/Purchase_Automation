import type { NotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
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
    // Inter-transaction handoff only: seller receives AR invoice from buyer PO.
    // Buyer does not need a confirmation notification.
    const buyerName = params.partner.buyerCompany.companyName.trim() || "Buyer";
    const poLabel = formatIcDocLabel({
      kind: "PO",
      docEntry: params.sourceDocEntry,
      docNum: params.sourceDocNum ?? null,
    });
    const arLabel = formatIcDocLabel({
      kind: "AR",
      docEntry: params.targetDocEntry,
      docNum: params.targetDocNum,
    });

    await notifications.create({
      companyId: params.partner.sellerCompany.companyId,
      documentId: params.targetDocEntry,
      documentType: IC_OBJECT.AR_INVOICE,
      flowStep: "FLOW2_AR_INVOICE_CREATED",
      message: `${buyerName} placed ${poLabel}. ${arLabel} was created — open ${arLabel} to review.`,
      priority: "MEDIUM",
      title: buyerName,
    });
  };
};
