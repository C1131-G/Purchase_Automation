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
    const draftLabel = params.targetDocNum
      ? `DocNum ${params.targetDocNum}`
      : `DocEntry ${params.targetDocEntry}`;

    await notifications.create({
      companyId: params.partner.sellerCompany.companyId,
      documentId: params.targetDocEntry,
      documentType: IC_OBJECT.AR_DRAFT,
      flowStep: "FLOW2_AR_DRAFT_CREATED",
      message: `Buyer ${params.partner.buyerCompany.companyCode} PO (${params.remarksTag}, entry ${params.sourceDocEntry}) created AR Invoice Draft ${draftLabel}.`,
      priority: "MEDIUM",
      title: `IC AR Draft created (${params.remarksTag})`,
    });

    // Optional buyer awareness (rows only; UI in P8).
    await notifications.create({
      companyId: params.partner.buyerCompany.companyId,
      documentId: params.sourceDocEntry,
      documentType: IC_OBJECT.PO,
      flowStep: "FLOW2_AR_DRAFT_CREATED",
      message: `Partner ${params.partner.sellerCompany.companyCode} has AR Invoice Draft ${draftLabel} for ${params.remarksTag}.`,
      priority: "LOW",
      title: `IC partner AR Draft created (${params.remarksTag})`,
    });
  };
};
