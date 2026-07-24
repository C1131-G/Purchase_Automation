import AppError from "@/core/errors/app-error";
import type { ConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import { createConfigurationService } from "@/modules/intercompany/config/configuration/configuration.service";
import type { TaxMappingService } from "@/modules/intercompany/config/tax-mapping/tax-mapping.service";
import { createTaxMappingService } from "@/modules/intercompany/config/tax-mapping/tax-mapping.service";
import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { HistoryService } from "@/modules/intercompany/domain/history/history.service";
import { createHistoryService } from "@/modules/intercompany/domain/history/history.service";
import type { NotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import { createNotificationService } from "@/modules/intercompany/domain/notification/notification.service";
import type { RetryService } from "@/modules/intercompany/domain/retry/retry.service";
import { createRetryService } from "@/modules/intercompany/domain/retry/retry.service";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import type { BpMappingService } from "@/modules/intercompany/config/bp-mapping/bp-mapping.service";
import { createBpMappingService } from "@/modules/intercompany/config/bp-mapping/bp-mapping.service";
import {
  DEFAULT_MAX_RETRY,
  IC_ACTION,
  IC_CONFIG_KEY,
  IC_DOC_MAP_STATUS,
  IC_RFQ_STATUS,
} from "@/modules/intercompany/infrastructure/constants";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createIcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import type { IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";

import { applyPricesToDraft } from "./apply-prices-to-draft";
import { convertDraftToPq } from "./convert-draft-to-pq";
import { createSellerSq } from "./create-seller-sq";

const LOG_SCOPE = IC_LOG_SCOPE.FLOW1_CONVERT;

export type ConvertPqAndSqService = {
  convert: (params: { rfqId: number; actorCompanyId: number }) => Promise<IcHookResult>;
};

export const createConvertPqAndSqService = (deps?: {
  rfq?: RfqService;
  documentMap?: DocumentMapService;
  notifications?: NotificationService;
  history?: HistoryService;
  retry?: RetryService;
  configuration?: ConfigurationService;
  taxMapping?: TaxMappingService;
  company?: CompanyService;
  bpMapping?: BpMappingService;
  documents?: IcSlDocuments;
}): ConvertPqAndSqService => {
  const rfq = deps?.rfq ?? createRfqService();
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const notifications = deps?.notifications ?? createNotificationService();
  const history = deps?.history ?? createHistoryService();
  const retry = deps?.retry ?? createRetryService();
  const configuration = deps?.configuration ?? createConfigurationService();
  const taxMapping = deps?.taxMapping ?? createTaxMappingService();
  const company = deps?.company ?? createCompanyService();
  const bpMapping = deps?.bpMapping ?? createBpMappingService();
  const documents = deps?.documents ?? createIcSlDocuments();

  return {
    convert: async ({ rfqId, actorCompanyId }) => {
      const startedAt = Date.now();
      const header = await rfq.getById(rfqId);
      if (!header) {
        icLog.warn(LOG_SCOPE, "Flow 1 convert check failed", {
          actorCompanyId,
          check: "rfq_exists",
          outcome: "fail",
          reason: "IC_RFQ_NOT_FOUND",
          rfqId,
        });
        throw new AppError("RFQ not found", 404, "IC_RFQ_NOT_FOUND");
      }

      if (header.sourceCompanyId !== actorCompanyId) {
        icLog.warn(LOG_SCOPE, "Flow 1 convert check failed", {
          actorCompanyId,
          check: "convert_actor",
          outcome: "fail",
          reason: "IC_RFQ_CONVERT_FORBIDDEN",
          rfqId,
          sourceCompanyId: header.sourceCompanyId,
        });
        throw new AppError(
          "Only the source (buyer) company can convert this RFQ",
          403,
          "IC_RFQ_CONVERT_FORBIDDEN",
        );
      }

      if (header.status === IC_RFQ_STATUS.COMPLETED) {
        icLog.info(LOG_SCOPE, "Flow 1 convert already complete", {
          check: "rfq_status",
          outcome: "pass",
          rfqId,
          status: header.status,
        });
        return {
          mappingId: undefined,
          status: "success",
          targetDoc: {
            entry: header.pqDraftDocEntry,
            type: IC_OBJECT.PQ,
          },
        };
      }

      if (header.status !== IC_RFQ_STATUS.SUBMITTED) {
        icLog.warn(LOG_SCOPE, "Flow 1 convert check failed", {
          check: "rfq_status",
          outcome: "fail",
          reason: "IC_RFQ_NOT_SUBMITTED",
          rfqId,
          status: header.status,
        });
        throw new AppError(
          `RFQ must be SUBMITTED to convert (current: ${header.status})`,
          409,
          "IC_RFQ_NOT_SUBMITTED",
        );
      }

      const lines = header.lines ?? [];
      if (lines.length === 0) {
        icLog.warn(LOG_SCOPE, "Flow 1 convert check failed", {
          check: "rfq_lines",
          outcome: "fail",
          reason: "IC_RFQ_EMPTY",
          rfqId,
        });
        throw new AppError("RFQ has no lines", 400, "IC_RFQ_EMPTY");
      }

      const sellerCompany = await company.getById(header.targetCompanyId);
      const buyerCompany = await company.getById(header.sourceCompanyId);
      if (!sellerCompany?.isActive || !buyerCompany?.isActive) {
        icLog.error(LOG_SCOPE, "Flow 1 convert check failed", {
          buyerCompanyId: header.sourceCompanyId,
          check: "company_active",
          outcome: "fail",
          reason: "IC_COMPANY_MISSING",
          rfqId,
          sellerCompanyId: header.targetCompanyId,
        });
        throw new AppError("IC company not found for RFQ parties", 500, "IC_COMPANY_MISSING");
      }

      const bpMap = await bpMapping.findByBuyerAndVendorCode(
        header.sourceCompanyId,
        header.vendorCode,
      );
      if (!bpMap) {
        icLog.error(LOG_SCOPE, "Flow 1 convert check failed", {
          buyerCompanyId: header.sourceCompanyId,
          check: "bp_mapping",
          outcome: "fail",
          reason: "IC_BP_MISSING",
          rfqId,
          vendorCode: header.vendorCode,
        });
        throw new AppError("BP mapping missing for RFQ vendor", 500, "IC_BP_MISSING");
      }

      icLog.info(LOG_SCOPE, "Flow 1 convert prechecks passed", {
        check: "convert_precheck",
        lineCount: lines.length,
        outcome: "pass",
        rfqId,
        sourceCompanyId: header.sourceCompanyId,
        targetCompanyId: header.targetCompanyId,
        vendorCode: header.vendorCode,
      });

      const remarksTag = `IC-RFQ-${header.rfqNumber}`;
      const draftEntry = header.pqDraftDocEntry;

      await applyPricesToDraft({
        buyerCompanyId: header.sourceCompanyId,
        documents,
        draftEntry,
        lines,
      });

      const purchaseQuotation = await convertDraftToPq({
        buyerCompanyId: header.sourceCompanyId,
        documents,
        draftEntry,
      });

      await documentMap.create({
        sourceCompanyId: header.sourceCompanyId,
        sourceDocEntry: String(header.rfqId),
        sourceDocNum: header.rfqNumber,
        sourceObject: IC_OBJECT.RFQ,
        sourceRemarksTag: remarksTag,
        status: IC_DOC_MAP_STATUS.SUCCESS,
        targetCompanyId: header.sourceCompanyId,
        targetDocEntry: String(purchaseQuotation.docEntry),
        targetDocNum: purchaseQuotation.docNum != null ? String(purchaseQuotation.docNum) : null,
        targetObject: IC_OBJECT.PQ,
      });

      const mapTaxCode = async (sourceTaxCode: string): Promise<string> => {
        const mapped = await taxMapping.mapTax(
          header.sourceCompanyId,
          header.targetCompanyId,
          sourceTaxCode,
        );
        if (mapped.hit) {
          return mapped.targetTaxCode;
        }
        icLog.warn(IC_LOG_SCOPE.TAX, "IC tax map miss on convert SQ; using source tax", {
          check: "tax_mapping",
          fallback: sourceTaxCode,
          outcome: "fail",
          rfqId,
          sourceCompanyId: header.sourceCompanyId,
          sourceTaxCode,
          targetCompanyId: header.targetCompanyId,
        });
        return sourceTaxCode;
      };

      try {
        const salesQuotation = await createSellerSq({
          buyerCustomerCode: bpMap.buyerCustomerCode,
          documents,
          lines,
          mapTaxCode,
          remarks: remarksTag,
          sellerCompanyId: header.targetCompanyId,
        });

        const sqMap = await documentMap.create({
          sourceCompanyId: header.sourceCompanyId,
          sourceDocEntry: String(purchaseQuotation.docEntry),
          sourceDocNum: purchaseQuotation.docNum != null ? String(purchaseQuotation.docNum) : null,
          sourceObject: IC_OBJECT.PQ,
          sourceRemarksTag: remarksTag,
          status: IC_DOC_MAP_STATUS.SUCCESS,
          targetCompanyId: header.targetCompanyId,
          targetDocEntry: String(salesQuotation.docEntry),
          targetDocNum: salesQuotation.docNum != null ? String(salesQuotation.docNum) : null,
          targetObject: IC_OBJECT.SQ,
        });

        await rfq.complete(rfqId);

        await notifications.create({
          companyId: header.targetCompanyId,
          documentId: String(salesQuotation.docEntry),
          documentType: IC_OBJECT.SQ,
          flowStep: "FLOW1_CONVERT_COMPLETE",
          message: `SQ created for RFQ ${header.rfqNumber} (buyer PQ entry ${purchaseQuotation.docEntry}).`,
          priority: "MEDIUM",
          title: `IC Flow 1 complete — SQ ${salesQuotation.docNum ?? salesQuotation.docEntry}`,
        });

        await notifications.create({
          companyId: header.sourceCompanyId,
          documentId: String(purchaseQuotation.docEntry),
          documentType: IC_OBJECT.PQ,
          flowStep: "FLOW1_CONVERT_COMPLETE",
          message: `RFQ ${header.rfqNumber} converted. PQ entry ${purchaseQuotation.docEntry}; partner SQ entry ${salesQuotation.docEntry}.`,
          priority: "LOW",
          title: `IC convert complete ${header.rfqNumber}`,
        });

        await history.append({
          action: IC_ACTION.FLOW1_CONVERT_PQ_SQ,
          companyId: header.sourceCompanyId,
          documentEntry: String(header.rfqId),
          documentType: IC_OBJECT.RFQ,
          durationMs: Date.now() - startedAt,
          responseJson: JSON.stringify({
            pqDocEntry: purchaseQuotation.docEntry,
            sqDocEntry: salesQuotation.docEntry,
          }),
          status: "SUCCESS",
        });

        icLog.info(LOG_SCOPE, "Flow 1 convert completed", {
          check: "complete",
          durationMs: Date.now() - startedAt,
          mappingId: sqMap.mappingId,
          outcome: "pass",
          pqDocEntry: purchaseQuotation.docEntry,
          rfqId,
          sqDocEntry: salesQuotation.docEntry,
        });

        return {
          mappingId: sqMap.mappingId,
          status: "success",
          targetDoc: {
            entry: salesQuotation.docEntry,
            num: salesQuotation.docNum,
            type: IC_OBJECT.SQ,
          },
        };
      } catch (sqErr: unknown) {
        const errorMessage = sqErr instanceof Error ? sqErr.message : String(sqErr);
        icLog.error(LOG_SCOPE, "Flow 1 SQ create failed after PQ convert; RFQ stays SUBMITTED", {
          check: "sl_create_sq",
          err: sqErr instanceof Error ? sqErr : new Error(errorMessage),
          outcome: "fail",
          pqDocEntry: purchaseQuotation.docEntry,
          rfqId,
          sellerCompanyId: header.targetCompanyId,
        });

        let mappingId: number | undefined;
        try {
          const errMap = await documentMap.create({
            errorMessage: errorMessage.slice(0, 2000),
            sourceCompanyId: header.sourceCompanyId,
            sourceDocEntry: String(purchaseQuotation.docEntry),
            sourceDocNum:
              purchaseQuotation.docNum != null ? String(purchaseQuotation.docNum) : null,
            sourceObject: IC_OBJECT.PQ,
            sourceRemarksTag: remarksTag,
            status: IC_DOC_MAP_STATUS.ERROR,
            targetCompanyId: header.targetCompanyId,
            targetObject: IC_OBJECT.SQ,
          });
          mappingId = errMap.mappingId;
        } catch {
          // best-effort
        }

        try {
          await history.append({
            action: IC_ACTION.FLOW1_CONVERT_PQ_SQ,
            companyId: header.sourceCompanyId,
            documentEntry: String(header.rfqId),
            documentType: IC_OBJECT.RFQ,
            durationMs: Date.now() - startedAt,
            responseJson: JSON.stringify({
              error: errorMessage.slice(0, 1000),
              pqDocEntry: purchaseQuotation.docEntry,
            }),
            status: "ERROR",
          });
        } catch {
          // best-effort
        }

        try {
          const maxRetry = await configuration.getNumber(
            IC_CONFIG_KEY.MAX_RETRY_COUNT,
            DEFAULT_MAX_RETRY,
          );
          const delayMinutes = await configuration.getNumber(IC_CONFIG_KEY.RETRY_DELAY_MINUTES, 5);
          const nextRetryAt = new Date(
            Date.now() + Math.max(delayMinutes, 1) * 60_000,
          ).toISOString();

          const item = await retry.enqueue({
            actionCode: IC_ACTION.FLOW1_CONVERT_PQ_SQ,
            companyId: header.sourceCompanyId,
            docMappingId: mappingId ?? null,
            errorMessage: errorMessage.slice(0, 2000),
            maxRetry,
            nextRetryAt,
            payloadJson: JSON.stringify({
              buyerCustomerCode: bpMap.buyerCustomerCode,
              pqDocEntry: purchaseQuotation.docEntry,
              remarksTag,
              rfqId: header.rfqId,
              sellerCompanyId: header.targetCompanyId,
            }),
            sourceDocument: IC_OBJECT.PQ,
            targetDocument: IC_OBJECT.SQ,
          });

          icLog.warn(LOG_SCOPE, "Flow 1 SQ failure; retry enqueued", {
            check: "retry_enqueue",
            outcome: "fail",
            retryId: item.retryId,
            rfqId,
          });

          return { retryId: item.retryId, status: "queued_retry" };
        } catch (retryErr: unknown) {
          icLog.error(LOG_SCOPE, "Flow 1 failed to enqueue SQ retry", {
            check: "retry_enqueue",
            err: retryErr instanceof Error ? retryErr : new Error(String(retryErr)),
            outcome: "fail",
            rfqId,
          });
          return {
            message: errorMessage.slice(0, 2000),
            status: "failed",
          };
        }
      }
    },
  };
};

export const convertPqAndSqService = createConvertPqAndSqService();
