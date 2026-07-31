import type { PartnerTaxResolver } from "@/modules/intercompany/config/tax-mapping/resolve-partner-tax.service";
import { createPartnerTaxResolver } from "@/modules/intercompany/config/tax-mapping/resolve-partner-tax.service";
import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import {
  partnerWarehouseMasters,
  type PartnerWarehouseMasters,
} from "@/modules/intercompany/config/warehouse/partner-warehouse.masters";
import type { DocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import { createDocumentMapService } from "@/modules/intercompany/domain/document-map/document-map.service";
import type { RfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { createRfqService } from "@/modules/intercompany/domain/rfq/rfq.service";
import { resolveBpCardName } from "@/modules/intercompany/infrastructure/ic-bp-card-name";
import { parseIcRemarkLinks } from "@/modules/intercompany/infrastructure/ic-remarks-chain";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import { IC_OBJECT } from "@/modules/intercompany/infrastructure/object-codes";
import type { ResolvePartnerResult } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.types";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";

import { buildArInvoicePayload } from "./build-ar-invoice.payload";
import type { BuildArInvoiceResult } from "./build-ar-invoice.types";

const toPositiveInt = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.trunc(num) : null;
};

/**
 * Resolve PQ + RFQ + SQ for AR remarks from PO Comments IC lines + document map.
 * Best-effort — never throws.
 */
const resolveArRemarksChain = async (params: {
  buyerCompanyId: number;
  existingComments?: string | null;
  documentMap: DocumentMapService;
  rfq: RfqService;
}): Promise<{
  pqDocNum: number | null;
  pqDocEntry: number | null;
  rfqNumber: string | null;
  rfqId: number | null;
  sqDocNum: number | null;
  sqDocEntry: number | null;
  cardNameFromRemarks: string | null;
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
  let sqDocNum = toPositiveInt(sqLink?.text ?? null);
  let sqDocEntry: number | null = null;
  const cardNameFromRemarks =
    pqLink?.cardName?.trim() || rfqLink?.cardName?.trim() || sqLink?.cardName?.trim() || null;

  // Unit tests use memory IC SQL only when deps are injected; default services hit live HANA.
  const allowLiveLookup = process.env.VITEST !== "true";
  if (allowLiveLookup) {
    try {
      // Prefer RFQ found by source PQ entry when Comments only carried PQ DocNum as RFQ number.
      if (pqDocNum != null) {
        const byDraft = await params.rfq.findBySourceDraft(params.buyerCompanyId, pqDocNum);
        // findBySourceDraft keys on DocEntry; try entry when number equals entry (common pilot).
        if (byDraft) {
          rfqId = byDraft.rfqId;
          rfqNumber = byDraft.rfqNumber || rfqNumber;
          pqDocEntry = byDraft.pqDraftDocEntry || pqDocEntry;
          pqDocNum = byDraft.pqDraftDocNum ?? pqDocNum;
        }
      }

      if (rfqId == null && rfqNumber) {
        // RFQ number often mirrors PQ DocNum — try as PQ entry lookup fallback.
        const asEntry = toPositiveInt(rfqNumber);
        if (asEntry != null) {
          const byEntry = await params.rfq.findBySourceDraft(params.buyerCompanyId, asEntry);
          if (byEntry) {
            rfqId = byEntry.rfqId;
            rfqNumber = byEntry.rfqNumber || rfqNumber;
            pqDocEntry = byEntry.pqDraftDocEntry || pqDocEntry;
            pqDocNum = byEntry.pqDraftDocNum ?? pqDocNum;
          }
        }
      }

      if (rfqId != null && sqDocEntry == null && sqDocNum == null) {
        const sqMap = await params.documentMap.findBySource({
          sourceCompanyId: params.buyerCompanyId,
          sourceDocEntry: String(rfqId),
          sourceObject: IC_OBJECT.RFQ,
          targetObject: IC_OBJECT.SQ,
        });
        if (sqMap) {
          sqDocEntry = toPositiveInt(sqMap.targetDocEntry);
          sqDocNum = toPositiveInt(sqMap.targetDocNum);
        }
      }
    } catch {
      // Best-effort chain enrichment only.
    }
  }

  return {
    cardNameFromRemarks,
    pqDocEntry,
    pqDocNum,
    rfqId,
    rfqNumber,
    sqDocEntry,
    sqDocNum,
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
  company?: CompanyService;
  partnerTax?: PartnerTaxResolver;
  warehouseMasters?: PartnerWarehouseMasters;
  documentMap?: DocumentMapService;
  rfq?: RfqService;
}): BuildArInvoiceService => {
  const company = deps?.company ?? createCompanyService();
  const partnerTax =
    deps?.partnerTax ??
    createPartnerTaxResolver({
      company,
    });
  const warehouseMasters = deps?.warehouseMasters ?? partnerWarehouseMasters;
  const documentMap = deps?.documentMap ?? createDocumentMapService();
  const rfq = deps?.rfq ?? createRfqService();

  return {
    build: async ({ partner, input, remarksTag }) => {
      const targetCompanyId = partner.sellerCompany.companyId;
      const targetSapDbName = partner.sellerCompany.sapDbName;
      const targetCardCode = partner.buyerCustomerCode;
      const defaultBranchId = partner.sellerCompany.defaultBranchId;

      // Branch from WH when WH exists on seller; else DEFAULT_BRANCH_ID. Never rewrite WH/UoM.
      const branchCtx = await resolveArDocumentBranch({
        defaultBranchId,
        lines: input.lines ?? [],
        sapDbName: targetSapDbName,
        warehouseMasters,
      });

      const chain = await resolveArRemarksChain({
        buyerCompanyId: partner.buyerCompany.companyId,
        documentMap,
        existingComments: input.remarks,
        rfq,
      });
      // AR customer is buyer BP on seller books — prefer that CardName for remarks.
      const remarksCardName = await resolveBpCardName({
        cardCode: partner.buyerCustomerCode,
        preferredName: chain.cardNameFromRemarks,
        sapDbName: targetSapDbName,
      });

      let taxItem = 0;
      let taxBp = 0;
      let taxOmit = 0;
      const resolvedPairs = new Set<string>();

      const built = await buildArInvoicePayload({
        buyerCustomerCode: partner.buyerCustomerCode,
        comments: input.remarks,
        defaultBranchId,
        documentBranchId: branchCtx.branchId,
        docDate: input.docDate,
        docDueDate: input.docDueDate,
        lines: input.lines,
        pqDocEntry: chain.pqDocEntry,
        pqDocNum: chain.pqDocNum,
        remarksCardName,
        resolveLineTax: async ({ itemCode, sourceTaxCode }) => {
          const resolved = await partnerTax.resolve({
            docSide: "sales",
            itemCode,
            sourceCompanyId: partner.buyerCompany.companyId,
            sourceSapDbName: partner.buyerCompany.sapDbName,
            sourceTaxCode,
            targetCardCode,
            targetCompanyId,
            targetSapDbName,
          });
          if (resolved.source === "ovtg_rate") {
            taxItem += 1;
            resolvedPairs.add(`${sourceTaxCode}->${resolved.taxCode}(ovtg)`);
          } else if (resolved.source === "item") {
            taxItem += 1;
            resolvedPairs.add(`${itemCode}->${resolved.taxCode}(item)`);
          } else if (resolved.source === "bp") {
            taxBp += 1;
            resolvedPairs.add(`${targetCardCode}->${resolved.taxCode}(bp)`);
          } else {
            taxOmit += 1;
          }
          return resolved.taxCode;
        },
        rfqId: chain.rfqId,
        rfqNumber: chain.rfqNumber,
        numAtCard: input.numAtCard,
        poDocEntry: input.docEntry,
        poDocNum: input.docNum ?? null,
        remarksTag,
        sapDbName: targetSapDbName,
        sqDocEntry: chain.sqDocEntry,
        sqDocNum: chain.sqDocNum,
      });

      const { taxUsage, ...payload } = built;

      icLog.info(IC_LOG_SCOPE.TAX, "IC partner tax summary for AR invoice (dynamic)", {
        branchId: branchCtx.branchId,
        branchSource: branchCtx.source,
        check: "tax_resolve_summary",
        defaultBranchId,
        outcome: taxOmit > 0 ? "fail" : "pass",
        // Explicit PO (buyer) vs AR (seller) tax codes per line.
        resolvedPairs: [...resolvedPairs],
        targetCompanyId,
        taxBp,
        taxItem,
        taxOmit,
        taxUsage,
      });

      return payload;
    },
  };
};

export const buildArInvoiceService = createBuildArInvoiceService();
