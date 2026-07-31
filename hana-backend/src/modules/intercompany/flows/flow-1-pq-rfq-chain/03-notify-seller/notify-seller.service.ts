import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import type { HistoryService } from "@/modules/intercompany/domain/history/history.service";
import { createHistoryService } from "@/modules/intercompany/domain/history/history.service";
import type { NotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import type { IcRfqHeader } from "@/modules/intercompany/domain/rfq/rfq.types";
import { IC_ACTION } from "@/modules/intercompany/infrastructure/constants";
import {
  formatIcPartyName,
  formatIcRfqCreatedMessage,
  formatIcRfqSubmittedMessage,
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
  company?: CompanyService;
}): NotifySellerService => {
  const notifications = deps?.notifications ?? createNotificationService();
  const history = deps?.history ?? createHistoryService();
  const company = deps?.company ?? createCompanyService();

  return {
    notifyRfqCreated: async (params) => {
      // RFQ owner = seller; source PQ owner = buyer. Full company names only.
      const sellerName = formatIcPartyName(params.partner.sellerCompany.companyName);
      const buyerName = formatIcPartyName(params.partner.buyerCompany.companyName);
      const rfqLabel = formatIcDocLabel({
        kind: "RFQ",
        rfqNumber: params.rfq.rfqNumber,
        docEntry: params.rfq.rfqId,
      });
      const pqLabel = formatIcDocLabel({
        kind: "PQ",
        docEntry: params.rfq.pqDraftDocEntry,
        docNum: params.rfq.pqDraftDocNum,
      });
      const message = formatIcRfqCreatedMessage({
        buyerCompanyName: buyerName,
        pqLabel,
        rfqLabel,
        sellerCompanyName: sellerName,
      });
      await notifications.create({
        companyId: params.partner.sellerCompany.companyId,
        documentId: String(params.rfq.rfqId),
        documentType: IC_OBJECT.RFQ,
        flowStep: "FLOW1_RFQ_CREATED",
        message,
        priority: "HIGH",
        title: sellerName || rfqLabel,
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
      // Buyer handoff: seller company submitted RFQ (seller owns RFQ).
      const sellerCompany =
        (await company.getById(params.rfq.targetCompanyId)) ??
        (params.rfq.targetCompanyName ? { companyName: params.rfq.targetCompanyName } : null);
      const sellerName = formatIcPartyName(
        sellerCompany?.companyName ?? params.rfq.targetCompanyName,
      );
      const rfqLabel = formatIcDocLabel({
        kind: "RFQ",
        rfqNumber: params.rfq.rfqNumber,
        docEntry: params.rfq.rfqId,
      });
      const message = formatIcRfqSubmittedMessage({
        rfqLabel,
        sellerCompanyName: sellerName,
      });
      await notifications.create({
        companyId: params.rfq.sourceCompanyId,
        documentId: String(params.rfq.rfqId),
        documentType: IC_OBJECT.RFQ,
        flowStep: "FLOW1_RFQ_SUBMITTED",
        message,
        priority: "MEDIUM",
        title: sellerName || rfqLabel,
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
