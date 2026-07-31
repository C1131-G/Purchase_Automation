import type { HistoryService } from "@/modules/intercompany/domain/history/history.service";
import { createHistoryService } from "@/modules/intercompany/domain/history/history.service";
import type { NotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import type { IcRfqHeader } from "@/modules/intercompany/domain/rfq/rfq.types";
import { IC_ACTION } from "@/modules/intercompany/infrastructure/constants";
import {
  formatIcCreatedMessage,
  formatIcCustomerParty,
  formatIcSubmittedMessage,
  formatIcVendorParty,
} from "@/modules/intercompany/infrastructure/ic-notification-copy";
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
  notifications?: NotificationService;
  history?: HistoryService;
}): NotifySellerService => {
  const notifications = deps?.notifications ?? createNotificationService();
  const history = deps?.history ?? createHistoryService();

  return {
    notifyRfqCreated: async (params) => {
      // Seller handoff: customer (buyer BP on seller books) created RFQ.
      const customerParty = formatIcCustomerParty(params.partner.buyerCustomerCode);
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
        message: formatIcCreatedMessage(customerParty, rfqLabel),
        priority: "HIGH",
        title: customerParty,
      });

      await history.append({
        action: IC_ACTION.FLOW1_CREATE_RFQ,
        companyId: params.partner.buyerCompany.companyId,
        documentEntry: params.sourceDocEntry,
        documentType: IC_OBJECT.PQ,
        durationMs: params.durationMs ?? null,
        responseJson: JSON.stringify({
          rfqId: params.rfq.rfqId,
          rfqNumber: params.rfq.rfqNumber,
        }),
        status: "SUCCESS",
      });
    },

    notifyRfqSubmitted: async (params) => {
      // Buyer handoff: vendor (seller BP on buyer books) submitted RFQ.
      const vendorParty = formatIcVendorParty(params.rfq.vendorCode);
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
        message: formatIcSubmittedMessage(vendorParty, rfqLabel),
        priority: "MEDIUM",
        title: vendorParty,
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
