import type { IcRfqLine } from "@/modules/intercompany/domain/rfq/rfq.types";
import {
  partnerWarehouseMasters,
  type PartnerWarehouseMasters,
} from "@/modules/intercompany/config/warehouse/partner-warehouse.masters";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import {
  flow1LineTaxUsage,
  type IcLineTaxUsage,
} from "@/modules/intercompany/infrastructure/ic-tax-usage";
import type {
  IcSlDocumentResult,
  IcSlDocuments,
} from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

/** Resolve seller VatGroup for one SQ line (empty string → omit field). */
export type ResolveSqLineTax = (input: {
  sourceTaxCode: string;
  itemCode: string;
}) => Promise<string>;

/**
 * Build SQ lines for the seller company.
 * - VatGroup only when resolver returns a **seller** tax code (never buyer tax).
 * - Warehouse: never copy buyer WH; use branch default WH only (no item-WH switch).
 */
export type BuildSqLinesResult = {
  documentLines: Record<string, unknown>[];
  /** Explicit PQ vs SQ tax per line (what IC used). */
  taxUsage: IcLineTaxUsage[];
};

export const buildSalesQuotationLines = async (
  lines: IcRfqLine[],
  resolveLineTax: ResolveSqLineTax,
  options?: {
    /** WH for the document branch (all lines share this). */
    branchWarehouseCode?: string | null;
  },
): Promise<BuildSqLinesResult> => {
  const branchWh = options?.branchWarehouseCode?.trim() || null;
  const documentLines: Record<string, unknown>[] = [];
  const taxUsage: IcLineTaxUsage[] = [];

  for (const line of lines) {
    // PQ tax = buyer RFQ/PQ purchase tax (source snapshot; never posted on seller SQ).
    const pqTaxCode = line.taxCode?.trim() || line.pqTaxCode?.trim() || "";
    const sqTaxCode = (
      await resolveLineTax({
        itemCode: line.itemCode ?? "",
        sourceTaxCode: pqTaxCode,
      })
    ).trim();

    taxUsage.push(
      flow1LineTaxUsage({
        itemCode: line.itemCode,
        lineNum: line.lineNum,
        pqTaxCode,
        sqTaxCode,
      }),
    );

    const docLine: Record<string, unknown> = {
      DiscountPercent: line.discount ?? 0,
      ItemCode: line.itemCode,
      Quantity: line.quantity,
      UnitPrice: line.unitPrice ?? 0,
    };
    // Only set when resolved to a real seller VAT group. Empty → omit so SAP
    // uses customer/item default tax (avoids "Invalid VAT Group" from buyer codes).
    if (sqTaxCode) {
      docLine.VatGroup = sqTaxCode;
    }

    if (branchWh) {
      docLine.WarehouseCode = branchWh;
    }

    if (line.uomCode) {
      docLine.UoMCode = line.uomCode;
      docLine.UseBaseUnit = "tNO";
    }
    if (line.deliveryDate) {
      docLine.ShipDate = line.deliveryDate;
    }
    documentLines.push(docLine);
  }
  return { documentLines, taxUsage };
};

/**
 * Prefer IC_COMPANY default branch + its WH.
 * If that branch has no active WH, switch to any branch that has an active WH.
 * Never pick branch/WH from item default warehouse.
 */
export const resolveSqWarehouseContext = async (params: {
  sapDbName?: string | null;
  defaultBranchId?: number | null;
  warehouseMasters?: PartnerWarehouseMasters;
}): Promise<{
  branchId: number | null;
  branchWarehouseCode: string | null;
  /** true when we left DEFAULT_BRANCH_ID because it had no WH */
  switchedFromDefault: boolean;
}> => {
  const preferredBranchRaw = params.defaultBranchId;
  const preferredBranchId =
    preferredBranchRaw != null && Number.isFinite(preferredBranchRaw) && preferredBranchRaw > 0
      ? Math.trunc(preferredBranchRaw)
      : null;
  const sapDbName = params.sapDbName?.trim() || null;
  if (!sapDbName) {
    return {
      branchId: preferredBranchId,
      branchWarehouseCode: null,
      switchedFromDefault: false,
    };
  }

  const masters = params.warehouseMasters ?? partnerWarehouseMasters;

  if (preferredBranchId != null) {
    const onDefault = await masters.getWarehouseForBranch(sapDbName, preferredBranchId);
    if (onDefault) {
      return {
        branchId: preferredBranchId,
        branchWarehouseCode: onDefault,
        switchedFromDefault: false,
      };
    }
  }

  const fallback = await masters.getFirstActiveBranchWarehouse(sapDbName);
  if (fallback) {
    return {
      branchId: fallback.branchId,
      branchWarehouseCode: fallback.warehouseCode,
      switchedFromDefault: preferredBranchId != null && preferredBranchId !== fallback.branchId,
    };
  }

  return {
    branchId: preferredBranchId,
    branchWarehouseCode: null,
    switchedFromDefault: false,
  };
};

export type CreateSellerSqResult = IcSlDocumentResult & {
  taxUsage: IcLineTaxUsage[];
};

export const createSellerSq = async (params: {
  documents: IcSlDocuments;
  sellerCompanyId: number;
  buyerCustomerCode: string;
  lines: IcRfqLine[];
  remarks: string;
  /** Buyer PQ draft vendor ref (NumAtCard) — set on seller SQ. */
  numAtCard?: string | null;
  resolveLineTax: ResolveSqLineTax;
  /** IC_COMPANY.DEFAULT_BRANCH_ID for seller — preferred BPL when multi-branch is active. */
  defaultBranchId?: number | null;
  /** Seller SAP company DB (IC_COMPANY.SAP_DB_NAME) for OWHS lookup. */
  sapDbName?: string | null;
  warehouseMasters?: PartnerWarehouseMasters;
}): Promise<CreateSellerSqResult> => {
  const warehouseCtx = await resolveSqWarehouseContext({
    defaultBranchId: params.defaultBranchId,
    sapDbName: params.sapDbName,
    warehouseMasters: params.warehouseMasters,
  });

  if (warehouseCtx.switchedFromDefault) {
    icLog.info(IC_LOG_SCOPE.FLOW1, "SQ branch switched: default had no warehouse", {
      check: "sq_branch_fallback",
      defaultBranchId: params.defaultBranchId ?? null,
      outcome: "pass",
      resolvedBranchId: warehouseCtx.branchId,
      resolvedWarehouse: warehouseCtx.branchWarehouseCode,
      sapDbName: params.sapDbName ?? null,
      sellerCompanyId: params.sellerCompanyId,
    });
  }

  // Multi-branch: we need a WH that matches document BPL. Fail only if neither
  // default nor any other branch has an active warehouse.
  if (
    (params.defaultBranchId != null || warehouseCtx.branchId != null) &&
    !warehouseCtx.branchWarehouseCode
  ) {
    icLog.warn(IC_LOG_SCOPE.FLOW1, "No active warehouse on seller company for SQ", {
      check: "sq_branch_warehouse",
      defaultBranchId: params.defaultBranchId ?? null,
      outcome: "fail",
      sapDbName: params.sapDbName ?? null,
      sellerCompanyId: params.sellerCompanyId,
    });
    throw new Error(
      `No active warehouse in ${params.sapDbName ?? "seller DB"}` +
        (params.defaultBranchId != null
          ? ` (default branch ${params.defaultBranchId} and no fallback BPL with OWHS)`
          : ` (no active OWHS with BPLid)`) +
        `; cannot create SQ with BPL_IDAssignedToInvoice`,
    );
  }

  const { documentLines, taxUsage } = await buildSalesQuotationLines(
    params.lines,
    params.resolveLineTax,
    {
      branchWarehouseCode: warehouseCtx.branchWarehouseCode,
    },
  );

  // Use resolved branch (may be fallback) so BPL matches line WarehouseCode.
  const documentBranchId = warehouseCtx.branchId ?? params.defaultBranchId ?? null;

  icLog.info(IC_LOG_SCOPE.FLOW1, "Flow 1 SQ lines prepared for seller", {
    branchWarehouseCode: warehouseCtx.branchWarehouseCode,
    check: "sq_lines_vat",
    defaultBranchId: params.defaultBranchId ?? null,
    documentBranchId,
    lineCount: documentLines.length,
    lines: documentLines.map((line, index) => ({
      itemCode: line.ItemCode ?? null,
      lineNum: index,
      // Explicit names — which tax each document type uses.
      pqTaxCode: taxUsage[index]?.pqTaxCode ?? null,
      quantity: line.Quantity ?? null,
      sqTaxCode: taxUsage[index]?.sqTaxCode ?? line.VatGroup ?? null,
      unitPrice: line.UnitPrice ?? null,
      vatGroup: line.VatGroup ?? null,
      warehouseCode: line.WarehouseCode ?? null,
    })),
    outcome: "pass",
    sapDbName: params.sapDbName ?? null,
    sellerCompanyId: params.sellerCompanyId,
    switchedFromDefault: warehouseCtx.switchedFromDefault,
    taxUsage,
  });

  const created = await params.documents.createSalesQuotation({
    cardCode: params.buyerCustomerCode,
    companyId: params.sellerCompanyId,
    defaultBranchId: documentBranchId,
    lines: documentLines,
    numAtCard: params.numAtCard ?? null,
    remarks: params.remarks,
  });
  return { ...created, taxUsage };
};
