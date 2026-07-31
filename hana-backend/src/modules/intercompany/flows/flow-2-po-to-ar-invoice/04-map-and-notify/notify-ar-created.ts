import type { NotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { resolveBpCardName } from "@/modules/intercompany/infrastructure/ic-bp-card-name";
import {
  formatIcCreatedMessage,
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
    // Seller handoff: buyer BP CardName only (never "Customer" / CardCode).
    const partyName = formatIcPartyName(
      await resolveBpCardName({
        cardCode: params.partner.buyerCustomerCode,
        sapDbName: params.partner.sellerCompany.sapDbName,
      }),
    );
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
      message: formatIcCreatedMessage(partyName, arLabel),
      priority: "MEDIUM",
      title: partyName || arLabel,
    });
  };
};
