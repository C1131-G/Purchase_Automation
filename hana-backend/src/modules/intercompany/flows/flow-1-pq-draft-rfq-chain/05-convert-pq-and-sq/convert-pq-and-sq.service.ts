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
import {
  FLOW1_CONVERT_STEPS,
  FLOW1_SCOPE,
  logFlowStep,
} from "@/modules/intercompany/infrastructure/flow-step-log";
import {
  appendIcRemarkLines,
  buildFlow1ConvertRemarks,
  buildFlow1SqRemarks,
  compactRfqTag,
  icLinkSq,
} from "@/modules/intercompany/infrastructure/ic-remarks-chain";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createIcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import type { IcHookResult } from "@/modules/intercompany/flows/shared/flow-result";

import { applyPricesToDraft, buildRfqCommercialDocumentLines } from "./apply-prices-to-draft";
import { convertDraftToPq } from "./convert-draft-to-pq";
import { createSellerSq } from "./create-seller-sq";

const LOG_SCOPE = FLOW1_SCOPE;
const CONVERT_SCOPE = IC_LOG_SCOPE.FLOW1_CONVERT;

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
      const logCtx = {
        actorCompanyId,
        flow: "flow1" as const,
        rfqId,
      };

      const header = await rfq.getById(rfqId);
      if (!header) {
        logFlowStep(LOG_SCOPE, {
          ...FLOW1_CONVERT_STEPS.START,
          check: "rfq_exists",
          ctx: logCtx,
          detail: { reason: "IC_RFQ_NOT_FOUND" },
          outcome: "fail",
          title: "Flow 1 — convert failed — RFQ not found",
        });
        throw new AppError("RFQ not found", 404, "IC_RFQ_NOT_FOUND");
      }

      if (header.sourceCompanyId !== actorCompanyId) {
        logFlowStep(LOG_SCOPE, {
          ...FLOW1_CONVERT_STEPS.START,
          check: "convert_actor",
          ctx: logCtx,
          detail: {
            reason: "IC_RFQ_CONVERT_FORBIDDEN",
            sourceCompanyId: header.sourceCompanyId,
          },
          outcome: "fail",
          title: "Flow 1 — convert failed — only buyer can convert",
        });
        throw new AppError(
          "Only the source (buyer) company can convert this RFQ",
          403,
          "IC_RFQ_CONVERT_FORBIDDEN",
        );
      }

      if (header.status === IC_RFQ_STATUS.COMPLETED) {
        logFlowStep(LOG_SCOPE, {
          ...FLOW1_CONVERT_STEPS.COMPLETE,
          check: "rfq_already_completed",
          ctx: {
            ...logCtx,
            rfqNumber: header.rfqNumber,
          },
          detail: { status: header.status },
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
        logFlowStep(LOG_SCOPE, {
          ...FLOW1_CONVERT_STEPS.START,
          check: "rfq_status",
          ctx: logCtx,
          detail: { reason: "IC_RFQ_NOT_SUBMITTED", status: header.status },
          outcome: "fail",
          title: "Flow 1 — convert failed — RFQ not SUBMITTED",
        });
        throw new AppError(
          `RFQ must be SUBMITTED to convert (current: ${header.status})`,
          409,
          "IC_RFQ_NOT_SUBMITTED",
        );
      }

      const lines = header.lines ?? [];
      if (lines.length === 0) {
        logFlowStep(LOG_SCOPE, {
          ...FLOW1_CONVERT_STEPS.START,
          check: "rfq_lines",
          ctx: logCtx,
          detail: { reason: "IC_RFQ_EMPTY" },
          outcome: "fail",
          title: "Flow 1 — convert failed — empty lines",
        });
        throw new AppError("RFQ has no lines", 400, "IC_RFQ_EMPTY");
      }

      const sellerCompany = await company.getById(header.targetCompanyId);
      const buyerCompany = await company.getById(header.sourceCompanyId);
      if (!sellerCompany?.isActive || !buyerCompany?.isActive) {
        logFlowStep(LOG_SCOPE, {
          ...FLOW1_CONVERT_STEPS.START,
          check: "company_active",
          ctx: logCtx,
          detail: {
            buyerCompanyId: header.sourceCompanyId,
            reason: "IC_COMPANY_MISSING",
            sellerCompanyId: header.targetCompanyId,
          },
          outcome: "fail",
          title: "Flow 1 — convert failed — company missing/inactive",
        });
        throw new AppError("IC company not found for RFQ parties", 500, "IC_COMPANY_MISSING");
      }

      const bpMap = await bpMapping.findByBuyerAndVendorCode(
        header.sourceCompanyId,
        header.vendorCode,
      );
      if (!bpMap) {
        logFlowStep(LOG_SCOPE, {
          ...FLOW1_CONVERT_STEPS.START,
          check: "bp_mapping",
          ctx: logCtx,
          detail: {
            buyerCompanyId: header.sourceCompanyId,
            reason: "IC_BP_MISSING",
            vendorCode: header.vendorCode,
          },
          outcome: "fail",
          title: "Flow 1 — convert failed — BP mapping missing",
        });
        throw new AppError("BP mapping missing for RFQ vendor", 500, "IC_BP_MISSING");
      }

      logFlowStep(LOG_SCOPE, {
        ...FLOW1_CONVERT_STEPS.START,
        ctx: {
          ...logCtx,
          rfqNumber: header.rfqNumber,
          sourceCompanyId: header.sourceCompanyId,
          targetCompanyId: header.targetCompanyId,
          vendorCode: header.vendorCode,
        },
        detail: {
          buyerCustomerCode: bpMap.buyerCustomerCode,
          buyerSapDb: buyerCompany.sapDbName,
          lineCount: lines.length,
          pqDraftDocEntry: header.pqDraftDocEntry,
          sellerSapDb: sellerCompany.sapDbName,
        },
      });

      // Compact tag for IC_DOCUMENT_MAPPING; multi-line chain for SAP Comments.
      const remarksTag = compactRfqTag(header.rfqNumber);
      const draftEntry = header.pqDraftDocEntry;

      // Keep any RFQ/header remarks; add PQD + RFQ lines (idempotent).
      const remarksBeforePq = buildFlow1ConvertRemarks({
        existing: header.remarks,
        pqDraftDocEntry: header.pqDraftDocEntry,
        pqDraftDocNum: header.pqDraftDocNum,
        rfqId: header.rfqId,
        rfqNumber: header.rfqNumber,
      });

      // Full commercial snapshot from RFQ → draft PATCH + convert POST merge.
      const commercialLines = buildRfqCommercialDocumentLines(lines);
      const missingCommercial = lines.filter(
        (line) =>
          line.unitPrice === null ||
          line.unitPrice === undefined ||
          !Number.isFinite(Number(line.quantity)) ||
          Number(line.quantity) <= 0,
      );
      if (missingCommercial.length > 0) {
        logFlowStep(LOG_SCOPE, {
          ...FLOW1_CONVERT_STEPS.APPLY_PRICES,
          check: "rfq_commercial_incomplete",
          ctx: logCtx,
          detail: {
            lineNums: missingCommercial.map((line) => line.lineNum),
            reason: "IC_RFQ_COMMERCIAL_INCOMPLETE",
          },
          outcome: "fail",
          title: "Flow 1 — convert failed — RFQ qty/price incomplete",
        });
        throw new AppError(
          "RFQ lines must have quoted quantity and unit price before convert",
          400,
          "IC_RFQ_COMMERCIAL_INCOMPLETE",
        );
      }

      logFlowStep(LOG_SCOPE, {
        ...FLOW1_CONVERT_STEPS.APPLY_PRICES,
        ctx: logCtx,
        detail: {
          draftEntry,
          lineCount: lines.length,
          lines: commercialLines.map((line) => ({
            discountPercent: line.DiscountPercent ?? null,
            itemCode: line.ItemCode ?? null,
            lineNum: line.LineNum ?? null,
            quantity: line.Quantity ?? null,
            unitPrice: line.UnitPrice ?? null,
            vatGroup: line.VatGroup ?? null,
          })),
          remarksPreview: remarksBeforePq.slice(0, 500),
        },
      });
      await applyPricesToDraft({
        buyerCompanyId: header.sourceCompanyId,
        comments: remarksBeforePq,
        documents,
        draftEntry,
        lines,
      });

      logFlowStep(LOG_SCOPE, {
        ...FLOW1_CONVERT_STEPS.DRAFT_TO_PQ,
        ctx: logCtx,
        detail: {
          draftEntry,
          lineCount: commercialLines.length,
        },
      });
      const purchaseQuotation = await convertDraftToPq({
        buyerCompanyId: header.sourceCompanyId,
        comments: remarksBeforePq,
        documents,
        draftEntry,
        lineOverrides: commercialLines,
      });

      // After PQ exists, chain includes PQ link for SQ / mapping notes.
      const remarksWithPq = buildFlow1ConvertRemarks({
        existing: remarksBeforePq,
        pqDraftDocEntry: header.pqDraftDocEntry,
        pqDraftDocNum: header.pqDraftDocNum,
        pqDocEntry: purchaseQuotation.docEntry,
        pqDocNum: purchaseQuotation.docNum ?? null,
        rfqId: header.rfqId,
        rfqNumber: header.rfqNumber,
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

      /**
       * Buyer purchase tax → seller sales tax via IC_TAX_MAPPING.
       * On miss: return "" (omit VatGroup on SQ). Never send buyer tax to seller —
       * that yields SAP 400 "Invalid VAT Group".
       */
      const mapTaxCode = async (sourceTaxCode: string): Promise<string> => {
        const code = sourceTaxCode.trim();
        if (!code) {
          return "";
        }
        const mapped = await taxMapping.mapTax(
          header.sourceCompanyId,
          header.targetCompanyId,
          code,
        );
        if (mapped.hit && mapped.targetTaxCode.trim()) {
          icLog.info(IC_LOG_SCOPE.TAX, "IC tax map hit for SQ", {
            check: "tax_mapping",
            outcome: "pass",
            rfqId,
            sourceCompanyId: header.sourceCompanyId,
            sourceTaxCode: code,
            targetCompanyId: header.targetCompanyId,
            targetTaxCode: mapped.targetTaxCode,
          });
          return mapped.targetTaxCode.trim();
        }
        icLog.warn(
          IC_LOG_SCOPE.TAX,
          "IC tax map miss on convert SQ — omit VatGroup (do not use buyer tax)",
          {
            check: "tax_mapping",
            hint: "INSERT IC_TAX_MAPPING for buyer→seller tax pair, or rely on BP default sales tax",
            outcome: "fail",
            rfqId,
            sourceCompanyId: header.sourceCompanyId,
            sourceTaxCode: code,
            targetCompanyId: header.targetCompanyId,
          },
        );
        return "";
      };

      try {
        logFlowStep(LOG_SCOPE, {
          ...FLOW1_CONVERT_STEPS.CREATE_SQ,
          ctx: logCtx,
          detail: {
            buyerCustomerCode: bpMap.buyerCustomerCode,
            pqDocEntry: purchaseQuotation.docEntry,
            pqDocNum: purchaseQuotation.docNum ?? null,
            sellerCompanyId: header.targetCompanyId,
          },
        });
        // SQ Comments: full chain PQD → RFQ → PQ (SQ entry appended after create for maps only).
        const sqRemarksBefore = buildFlow1SqRemarks({
          existing: remarksWithPq,
          pqDraftDocEntry: header.pqDraftDocEntry,
          pqDraftDocNum: header.pqDraftDocNum,
          pqDocEntry: purchaseQuotation.docEntry,
          pqDocNum: purchaseQuotation.docNum ?? null,
          rfqId: header.rfqId,
          rfqNumber: header.rfqNumber,
        });

        const salesQuotation = await createSellerSq({
          buyerCustomerCode: bpMap.buyerCustomerCode,
          documents,
          lines,
          mapTaxCode,
          remarks: sqRemarksBefore,
          sellerCompanyId: header.targetCompanyId,
        });

        const sqRemarksFinal = appendIcRemarkLines(sqRemarksBefore, [
          icLinkSq(salesQuotation.docNum ?? null, salesQuotation.docEntry),
        ]);

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

        icLog.info(LOG_SCOPE, "Flow 1 remarks chain (SQ)", {
          check: "remarks_chain",
          outcome: "pass",
          remarks: sqRemarksFinal.slice(0, 1000),
          rfqId,
        });

        await rfq.complete(rfqId);

        const [buyerCo, sellerCo] = await Promise.all([
          company.getById(header.sourceCompanyId),
          company.getById(header.targetCompanyId),
        ]);
        const buyerName = buyerCo?.companyName?.trim() || "Buyer";
        const sellerName = sellerCo?.companyName?.trim() || "Seller";
        const sqRef = salesQuotation.docNum ?? salesQuotation.docEntry;
        const pqRef = purchaseQuotation.docNum ?? purchaseQuotation.docEntry;

        await notifications.create({
          companyId: header.targetCompanyId,
          documentId: String(salesQuotation.docEntry),
          documentType: IC_OBJECT.SQ,
          flowStep: "FLOW1_CONVERT_COMPLETE",
          message: `${buyerName}: SQ ${sqRef} for RFQ ${header.rfqNumber}.`,
          priority: "MEDIUM",
          title: buyerName,
        });

        await notifications.create({
          companyId: header.sourceCompanyId,
          documentId: String(purchaseQuotation.docEntry),
          documentType: IC_OBJECT.PQ,
          flowStep: "FLOW1_CONVERT_COMPLETE",
          message: `${sellerName}: RFQ ${header.rfqNumber} → PQ ${pqRef} & SQ ${sqRef}.`,
          priority: "LOW",
          title: sellerName,
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

        logFlowStep(LOG_SCOPE, {
          ...FLOW1_CONVERT_STEPS.COMPLETE,
          ctx: {
            ...logCtx,
            rfqNumber: header.rfqNumber,
          },
          detail: {
            durationMs: Date.now() - startedAt,
            mappingId: sqMap.mappingId,
            pqDocEntry: purchaseQuotation.docEntry,
            pqDocNum: purchaseQuotation.docNum ?? null,
            sqDocEntry: salesQuotation.docEntry,
            sqDocNum: salesQuotation.docNum ?? null,
            status: "success",
          },
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
        logFlowStep(LOG_SCOPE, {
          ...FLOW1_CONVERT_STEPS.CREATE_SQ,
          check: "sl_create_sq",
          ctx: logCtx,
          detail: {
            error: errorMessage.slice(0, 2000),
            note: "PQ may already exist; RFQ stays SUBMITTED",
            pqDocEntry: purchaseQuotation.docEntry,
            sellerCompanyId: header.targetCompanyId,
          },
          outcome: "fail",
          title: "Flow 1 — create seller SQ failed",
        });
        icLog.error(
          CONVERT_SCOPE,
          "Flow 1 SQ create failed after PQ convert; RFQ stays SUBMITTED",
          {
            check: "sl_create_sq",
            err: sqErr instanceof Error ? sqErr : new Error(errorMessage),
            outcome: "fail",
            pqDocEntry: purchaseQuotation.docEntry,
            rfqId,
            sellerCompanyId: header.targetCompanyId,
          },
        );

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

          logFlowStep(LOG_SCOPE, {
            ...FLOW1_CONVERT_STEPS.COMPLETE,
            check: "retry_enqueue",
            ctx: logCtx,
            detail: {
              pqDocEntry: purchaseQuotation.docEntry,
              retryId: item.retryId,
              status: "queued_retry",
            },
            outcome: "fail",
            title: "Flow 1 — convert done — SQ failed, retry queued",
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
