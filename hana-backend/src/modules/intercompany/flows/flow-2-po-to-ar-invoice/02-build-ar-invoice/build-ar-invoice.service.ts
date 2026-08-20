import {
  partnerWarehouseMasters,
  type PartnerWarehouseMasters,
} from "@/modules/intercompany/config/warehouse/partner-warehouse.masters";
import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { IC_DOC_MAP_STATUS } from "@/modules/intercompany/infrastructure/constants";
import { parseIcRemarkLinks } from "@/modules/intercompany/infrastructure/ic-remarks-chain";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { IcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import { createIcSlDocuments } from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";
import type { ResolvePartnerResult } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.types";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";

import { buildArInvoicePayload } from "./build-ar-invoice.payload";
import type { BuildArInvoiceResult, SqBaseLineInput } from "./build-ar-invoice.types";

const toPositiveInt = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.trunc(num) : null;
};

/**
 * Resolve PQ + RFQ + SQ for AR draft remarks / convert base from PO Comments + document map.
 * Best-effort for PQ/RFQ; SQ DocEntry is required by the caller after this returns.
 */
const resolveArRemarksChain = async (params: {
  buyerCompanyId: number;
  buyerCustomerCode?: string | null;
  existingComments?: string | null;
  documentMap: DocumentMapService;
  documents: IcSlDocuments;
  rfq: RfqService;
  sellerCompanyId: number;
}): Promise<{
  pqDocNum: number | null;
  pqDocEntry: number | null;
  rfqNumber: string | null;
  rfqId: number | null;
  rfqStatus: string | null;
  sqDocNum: number | null;
  sqDocEntry: number | null;
  sqMapStatus: string | null;
  sqResolveSource: "remarks" | "document_map" | "sl_chain" | null;
}> => {
  const links = parseIcRemarkLinks(params.existingComments);
  const byKey = new Map(links.map((link) => [link.key.toUpperCase(), link]));
  const pqLink = byKey.get("PQ");
  const rfqLink = byKey.get("RFQ");
  const sqLink = byKey.get("SQ");

  let pqDocNum = toPositiveInt(pqLink?.text ?? null);
  let pqDocEntry: number | null = null;
  let rfqNumber = rfqLink?.text?.trim() || null;
  let rfqId: number | null = null;
  let rfqStatus: string | null = null;
  let sqDocNum = toPositiveInt(sqLink?.text ?? null);
  let sqDocEntry: number | null = null;
  let sqMapStatus: string | null = null;
  let sqResolveSource: "remarks" | "document_map" | "sl_chain" | null =
    sqDocNum != null ? "remarks" : null;

  try {
    // Remarks write PQ/RFQ DocNum (e.g. 8000603), not SAP DocEntry. Resolve RFQ by
    // entry OR num OR RFQ_NUMBER so Flow 2 can load the RFQ→SQ document map.
    const remarkCandidates: Array<number | string> = [];
    if (pqDocNum != null) {
      remarkCandidates.push(pqDocNum);
    }
    if (rfqNumber) {
      remarkCandidates.push(rfqNumber);
    }
    const asRfqEntry = toPositiveInt(rfqNumber);
    if (asRfqEntry != null && asRfqEntry !== pqDocNum) {
      remarkCandidates.push(asRfqEntry);
    }

    for (const candidate of remarkCandidates) {
      if (rfqId != null) {
        break;
      }
      const found = await params.rfq.findBySourceRemarkRef(params.buyerCompanyId, candidate);
      if (found) {
        rfqId = found.rfqId;
        rfqNumber = found.rfqNumber || rfqNumber;
        pqDocEntry = found.pqDraftDocEntry || pqDocEntry;
        pqDocNum = found.pqDraftDocNum ?? pqDocNum;
        rfqStatus = found.status != null ? String(found.status) : null;
      }
    }

    // Flow 1 maps RFQ → SQ (source = buyer company / RFQ id). Prefer SUCCESS + target.
    if (rfqId != null && sqDocEntry == null) {
      const sqMap = await params.documentMap.findBySource({
        sourceCompanyId: params.buyerCompanyId,
        sourceDocEntry: String(rfqId),
        sourceObject: IC_OBJECT.RFQ,
        targetObject: IC_OBJECT.SQ,
      });
      if (sqMap) {
        sqMapStatus = sqMap.status;
        sqDocEntry = toPositiveInt(sqMap.targetDocEntry);
        sqDocNum = toPositiveInt(sqMap.targetDocNum) ?? sqDocNum;
        if (sqDocEntry != null) {
          sqResolveSource = "document_map";
        } else {
          icLog.warn(IC_LOG_SCOPE.FLOW2, "RFQ→SQ map found without target DocEntry", {
            check: "sq_map_empty_target",
            mappingId: sqMap.mappingId,
            outcome: "fail",
            rfqId,
            status: sqMap.status,
            targetCompanyId: sqMap.targetCompanyId,
          });
        }
      }
    }

    // Recovery: seller SQ exists in SAP but IC map missing / ERROR without target.
    // Match customer + Comments tokens (PQ DocNum / RFQ number / "Based on PQ …").
    if (sqDocEntry == null) {
      const tokens: string[] = [];
      if (pqDocNum != null) {
        tokens.push(`Based on PQ ${pqDocNum}`, String(pqDocNum));
      }
      if (rfqNumber) {
        tokens.push(`Based on RFQ ${rfqNumber}`, rfqNumber);
      }
      const cardCode = String(params.buyerCustomerCode ?? "").trim();
      if (cardCode && tokens.length > 0) {
        const byChain = await params.documents.findSalesQuotationByIcChain({
          cardCode,
          companyId: params.sellerCompanyId,
          remarkTokens: tokens,
        });
        if (byChain) {
          sqDocEntry = byChain.docEntry;
          sqDocNum = byChain.docNum ?? sqDocNum;
          sqResolveSource = "sl_chain";
          icLog.info(IC_LOG_SCOPE.FLOW2, "seller SQ resolved via SL remarks chain", {
            check: "sq_resolve_sl_chain",
            outcome: "pass",
            pqDocNum,
            rfqId,
            rfqNumber,
            sqDocEntry,
            sqDocNum,
          });
          // Best-effort repair of RFQ→SQ map for the next PO / relationship map.
          if (rfqId != null) {
            try {
              await params.documentMap.create({
                sourceCompanyId: params.buyerCompanyId,
                sourceDocEntry: String(rfqId),
                sourceDocNum: rfqNumber,
                sourceObject: IC_OBJECT.RFQ,
                status: IC_DOC_MAP_STATUS.SUCCESS,
                targetCompanyId: params.sellerCompanyId,
                targetDocEntry: String(byChain.docEntry),
                targetDocNum: byChain.docNum != null ? String(byChain.docNum) : null,
                targetObject: IC_OBJECT.SQ,
              });
            } catch {
              // non-fatal
            }
          }
        }
      }
    }
  } catch (err: unknown) {
    icLog.warn(IC_LOG_SCOPE.FLOW2, "SQ chain resolve threw (best-effort continues)", {
      check: "sq_chain_resolve_error",
      err: err instanceof Error ? err.message : String(err),
      outcome: "fail",
    });
  }

  return {
    pqDocEntry,
    pqDocNum,
    rfqId,
    rfqNumber,
    rfqStatus,
    sqDocEntry,
    sqDocNum,
    sqMapStatus,
    sqResolveSource,
  };
};

export type BuildArInvoiceService = {
  build: (params: {
    partner: ResolvePartnerResult;
    input: IcPoHookInput;
    remarksTag: string;
  }) => Promise<BuildArInvoiceResult>;
};

/**
 * Align document BPL to first line warehouse when that WH exists on seller.
 * Does not change WarehouseCode or UoM on lines — only branch.
 * For SQ convert, branch still comes from PO lines (same WH as IC chain) or default.
 */
export const resolveArDocumentBranch = async (params: {
  sapDbName?: string | null;
  defaultBranchId?: number | null;
  lines: unknown[];
  warehouseMasters?: PartnerWarehouseMasters;
}): Promise<{ branchId: number | null; source: "warehouse" | "default" | "none" }> => {
  const defaultBranchId =
    params.defaultBranchId != null &&
    Number.isFinite(params.defaultBranchId) &&
    params.defaultBranchId > 0
      ? Math.trunc(params.defaultBranchId)
      : null;
  const sapDbName = params.sapDbName?.trim() || null;
  const masters = params.warehouseMasters ?? partnerWarehouseMasters;

  let firstWh: string | null = null;
  for (const raw of params.lines) {
    const line = raw as Record<string, unknown>;
    const warehouseCode = String(line.WarehouseCode ?? line.warehouseCode ?? "").trim();
    if (warehouseCode) {
      firstWh = warehouseCode;
      break;
    }
  }

  if (sapDbName && firstWh) {
    const found = await masters.resolveWarehouseIfExists(sapDbName, firstWh);
    if (found) {
      return { branchId: found.branchId, source: "warehouse" };
    }
  }

  if (defaultBranchId != null) {
    return { branchId: defaultBranchId, source: "default" };
  }
  return { branchId: null, source: "none" };
};

export const createBuildArInvoiceService = (deps?: {
  warehouseMasters?: PartnerWarehouseMasters;
  documentMap?: DocumentMapService;
  rfq?: RfqService;
  documents?: IcSlDocuments;
}): BuildArInvoiceService => {
  const warehouseMasters = deps?.warehouseMasters ?? partnerWarehouseMasters;
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const rfq = deps?.rfq ?? createRfqService();
  const documents = deps?.documents ?? createIcSlDocuments();

  return {
    build: async ({ partner, input, remarksTag }) => {
      const targetCompanyId = partner.sellerCompany.companyId;
      const targetSapDbName = partner.sellerCompany.sapDbName;
      const defaultBranchId = partner.sellerCompany.defaultBranchId;

      // Branch from WH when WH exists on seller; else DEFAULT_BRANCH_ID.
      const branchCtx = await resolveArDocumentBranch({
        defaultBranchId,
        lines: input.lines ?? [],
        sapDbName: targetSapDbName,
        warehouseMasters,
      });

      const chain = await resolveArRemarksChain({
        buyerCompanyId: partner.buyerCompany.companyId,
        buyerCustomerCode: partner.buyerCustomerCode,
        documentMap,
        documents,
        existingComments: input.remarks,
        rfq,
        sellerCompanyId: targetCompanyId,
      });

      let sqDocEntry = chain.sqDocEntry;
      let sqDocNum = chain.sqDocNum;
      let sqLines: SqBaseLineInput[] = [];

      // Resolve SQ DocEntry when remarks only carried DocNum.
      if (sqDocEntry == null && sqDocNum != null) {
        const byNum = await documents.findSalesQuotationByDocNum({
          companyId: targetCompanyId,
          docNum: sqDocNum,
        });
        if (byNum) {
          sqDocEntry = byNum.docEntry;
          sqDocNum = byNum.docNum ?? sqDocNum;
          sqLines = byNum.documentLines;
        }
      }

      if (sqDocEntry == null) {
        const rfqHint =
          chain.rfqStatus != null
            ? ` RFQ status=${chain.rfqStatus}`
            : chain.rfqId != null
              ? " RFQ found but no seller SQ map"
              : " RFQ not found from PO remarks";
        const mapHint =
          chain.sqMapStatus != null ? ` mapStatus=${chain.sqMapStatus}` : " no RFQ→SQ map row";
        icLog.warn(IC_LOG_SCOPE.FLOW2, "seller SQ not resolved from PO remarks / RFQ map", {
          check: "sq_resolve_failed",
          outcome: "fail",
          pqDocEntry: chain.pqDocEntry,
          pqDocNum: chain.pqDocNum,
          remarksPreview: String(input.remarks ?? "").slice(0, 500),
          rfqId: chain.rfqId,
          rfqNumber: chain.rfqNumber,
          rfqStatus: chain.rfqStatus,
          sqDocNum: chain.sqDocNum,
          sqMapStatus: chain.sqMapStatus,
          sqResolveSource: chain.sqResolveSource,
          targetCompanyId,
        });
        throw new Error(
          `IC Flow 2: seller Sales Quotation not found for this PO — cannot convert SQ to A/R Invoice Draft (complete Flow 1 RFQ→SQ first, or ensure PO remarks include SQ).${rfqHint};${mapHint}`,
        );
      }

      // Load open SQ lines when not already fetched by DocNum lookup.
      if (sqLines.length === 0) {
        const salesQuotation = await documents.getSalesQuotation({
          companyId: targetCompanyId,
          docEntry: sqDocEntry,
        });
        sqDocEntry = salesQuotation.docEntry;
        sqDocNum = salesQuotation.docNum ?? sqDocNum;
        sqLines = salesQuotation.documentLines;
        if (salesQuotation.cardCode && salesQuotation.cardCode !== partner.buyerCustomerCode) {
          icLog.warn(IC_LOG_SCOPE.FLOW2, "SQ CardCode differs from mapped buyer customer", {
            check: "sq_cardcode_mismatch",
            mappedBuyerCustomer: partner.buyerCustomerCode,
            outcome: "fail",
            sqCardCode: salesQuotation.cardCode,
            sqDocEntry,
            targetCompanyId,
          });
        }
      }

      const payload = buildArInvoicePayload({
        buyerCompanyName: partner.buyerCompany.companyName,
        buyerCustomerCode: partner.buyerCustomerCode,
        comments: input.remarks,
        defaultBranchId,
        documentBranchId: branchCtx.branchId,
        docDate: input.docDate,
        docDueDate: input.docDueDate,
        numAtCard: input.numAtCard,
        poDocEntry: input.docEntry,
        poDocNum: input.docNum ?? null,
        portalCreatedBy: input.portalCreatedBy,
        pqDocEntry: chain.pqDocEntry,
        pqDocNum: chain.pqDocNum,
        remarksTag,
        rfqId: chain.rfqId,
        rfqNumber: chain.rfqNumber,
        sapDbName: targetSapDbName,
        sellerCompanyName: partner.sellerCompany.companyName,
        sqDocEntry,
        sqDocNum,
        sqLines,
      });

      icLog.info(IC_LOG_SCOPE.FLOW2, "IC AR invoice draft built from seller SQ convert", {
        branchId: branchCtx.branchId,
        branchSource: branchCtx.source,
        check: "ar_draft_from_sq_convert",
        defaultBranchId,
        lineCount: payload.DocumentLines.length,
        outcome: "pass",
        sqDocEntry,
        sqDocNum,
        targetCompanyId,
      });

      return payload;
    },
  };
};

export const buildArInvoiceService = createBuildArInvoiceService();
