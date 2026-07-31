import type { PartnerTaxResolver } from "@/modules/intercompany/config/tax-mapping/resolve-partner-tax.service";
import { createPartnerTaxResolver } from "@/modules/intercompany/config/tax-mapping/resolve-partner-tax.service";
import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import {
  partnerWarehouseMasters,
  type PartnerWarehouseMasters,
} from "@/modules/intercompany/config/warehouse/partner-warehouse.masters";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import type { ResolvePartnerResult } from "@/modules/intercompany/routing/resolve-partner/resolve-partner.types";
import type { IcPoHookInput } from "@/modules/intercompany/flows/shared/flow.types";

import { buildArInvoicePayload } from "./build-ar-invoice.payload";
import type { BuildArInvoiceResult } from "./build-ar-invoice.types";

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
}): BuildArInvoiceService => {
  const company = deps?.company ?? createCompanyService();
  const partnerTax =
    deps?.partnerTax ??
    createPartnerTaxResolver({
      company,
    });
  const warehouseMasters = deps?.warehouseMasters ?? partnerWarehouseMasters;

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
        numAtCard: input.numAtCard,
        poDocEntry: input.docEntry,
        poDocNum: input.docNum ?? null,
        remarksTag,
        sapDbName: targetSapDbName,
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
