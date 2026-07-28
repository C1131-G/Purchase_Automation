import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import type { HistoryService } from "@/modules/intercompany/domain/history/history.service";
import { createHistoryService } from "@/modules/intercompany/domain/history/history.service";
import type { NotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import type { IcRfqHeader } from "@/modules/intercompany/domain/rfq/rfq.types";
import { IC_ACTION } from "@/modules/intercompany/infrastructure/constants";
import { formatIcDocLabel } from "@/modules/intercompany/infrastructure/ic-remarks-chain";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { ResolvePartnerResult } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.types";

export type NotifySellerService = {
  notifyRfqCreated: (params: {
    partner: ResolvePartnerResult;
    rfq: IcRfqHeader;
    remarksTag: string;
    sourceDocEntry: string;
    durationMs?: number;
  }) => Promise<void>;
  notifyRfqSubmitted: (params: { rfq: IcRfqHeader }) => Promise<void>;
};

export const createNotifySellerService = (deps?: {
  company?: CompanyService;
  notifications?: NotificationService;
  history?: HistoryService;
}): NotifySellerService => {
  const company = deps?.company ?? createCompanyService();
  const notifications = deps?.notifications ?? createNotificationService();
  const history = deps?.history ?? createHistoryService();

  return {
    notifyRfqCreated: async (params) => {
      // Handoff only: seller must act on new RFQ (buyer gets no create notify).
      const buyerName = params.partner.buyerCompany.companyName.trim() || "Buyer";
      const rfqLabel = formatIcDocLabel({
        kind: "RFQ",
        rfqNumber: params.rfq.rfqNumber,
        docEntry: params.rfq.rfqId,
      });
      await notifications.create({
        companyId: params.partner.sellerCompany.companyId,
        documentId: String(params.rfq.rfqId),
        documentType: IC_OBJECT.RFQ,
        flowStep: "FLOW1_RFQ_CREATED",
        message: `${buyerName} sent ${rfqLabel}. Open ${rfqLabel} to enter your prices.`,
        priority: "HIGH",
        // TITLE stores source company for list/filter (Company column).
        title: buyerName,
      });

      await history.append({
        action: IC_ACTION.FLOW1_CREATE_RFQ,
        companyId: params.partner.buyerCompany.companyId,
        documentEntry: params.sourceDocEntry,
        documentType: IC_OBJECT.PQ_DRAFT,
        durationMs: params.durationMs ?? null,
        responseJson: JSON.stringify({
          rfqId: params.rfq.rfqId,
          rfqNumber: params.rfq.rfqNumber,
        }),
        status: "SUCCESS",
      });
    },

    notifyRfqSubmitted: async (params) => {
      // Handoff only: buyer must see seller quote (seller gets no submit notify).
      const seller = await company.getById(params.rfq.targetCompanyId);
      const sellerName = seller?.companyName?.trim() || "Seller";
      const rfqLabel = formatIcDocLabel({
        kind: "RFQ",
        rfqNumber: params.rfq.rfqNumber,
        docEntry: params.rfq.rfqId,
      });
      await notifications.create({
        companyId: params.rfq.sourceCompanyId,
        documentId: String(params.rfq.rfqId),
        documentType: IC_OBJECT.RFQ,
        flowStep: "FLOW1_RFQ_SUBMITTED",
        message: `${sellerName} submitted ${rfqLabel}. Open ${rfqLabel} to review and convert.`,
        priority: "MEDIUM",
        title: sellerName,
      });

      await history.append({
        action: IC_ACTION.FLOW1_SUBMIT_RFQ,
        companyId: params.rfq.targetCompanyId,
        documentEntry: String(params.rfq.rfqId),
        documentType: IC_OBJECT.RFQ,
        responseJson: JSON.stringify({ status: params.rfq.status }),
        status: "SUCCESS",
      });
    },
  };
};

export const notifySellerService = createNotifySellerService();
