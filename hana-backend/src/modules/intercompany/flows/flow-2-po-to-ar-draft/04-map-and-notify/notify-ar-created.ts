import type { NotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { ResolvePartnerResult } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.types";

export type NotifyArCreatedParams = {
  partner: ResolvePartnerResult;
  remarksTag: string;
  sourceDocEntry: string;
  targetDocEntry: string;
  targetDocNum: string | null;
};

export const createNotifyArCreated = (
  notifications: NotificationService = createNotificationService(),
) => {
  return async (params: NotifyArCreatedParams): Promise<void> => {
    const buyerName = params.partner.buyerCompany.companyName.trim() || "Buyer";
    const sellerName = params.partner.sellerCompany.companyName.trim() || "Seller";
    const draftRef = params.targetDocNum ?? params.targetDocEntry;

    await notifications.create({
      companyId: params.partner.sellerCompany.companyId,
      documentId: params.targetDocEntry,
      documentType: IC_OBJECT.AR_DRAFT,
      flowStep: "FLOW2_AR_DRAFT_CREATED",
      message: `${buyerName} PO created AR draft ${draftRef}.`,
      priority: "MEDIUM",
      title: buyerName,
    });

    await notifications.create({
      companyId: params.partner.buyerCompany.companyId,
      documentId: params.sourceDocEntry,
      documentType: IC_OBJECT.PO,
      flowStep: "FLOW2_AR_DRAFT_CREATED",
      message: `${sellerName} has AR draft ${draftRef}.`,
      priority: "LOW",
      title: sellerName,
    });
  };
};
