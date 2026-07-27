import type { IcRfqLine } from "@/modules/intercompany/domain/rfq/rfq.types";
import {
  partnerWarehouseMasters,
  type PartnerWarehouseMasters,
} from "@/modules/intercompany/config/warehouse/partner-warehouse.masters";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";
import type {
  IcSlDocumentResult,
  IcSlDocuments,
} from "@/modules/intercompany/infrastructure/service-layer/ic-sl.documents";

/** Resolve seller VatGroup for one SQ line (empty string → omit field). */
export type ResolveSqLineTax = (input: {
  sourceTaxCode: string;
  itemCode: string;
}) => Promise<string>;

export type ResolveSqLineWarehouse = (input: { itemCode: string }) => Promise<string | null>;

/**
 * Build SQ lines for the seller company.
 * - VatGroup only when resolver returns a **seller** tax code (never buyer tax).
 * - Warehouse: never copy buyer WH; when multi-branch, set seller WH that matches document BPL.
 */
export const buildSalesQuotationLines = async (
  lines: IcRfqLine[],
  resolveLineTax: ResolveSqLineTax,
  options?: {
    /** Fallback WH for the document branch (all lines). */
    branchWarehouseCode?: string | null;
    /** Prefer item default WH when it is on the same branch. */
    resolveLineWarehouse?: ResolveSqLineWarehouse;
  },
): Promise<Record<string, unknown>[]> => {
  const branchWh = options?.branchWarehouseCode?.trim() || null;
  const resolveLineWarehouse = options?.resolveLineWarehouse;
  const result: Record<string, unknown>[] = [];

  for (const line of lines) {
    const sourceTax = line.taxCode?.trim() ?? "";
    const targetTax = (
      await resolveLineTax({
        itemCode: line.itemCode ?? "",
        sourceTaxCode: sourceTax,
      })
    ).trim();

    const docLine: Record<string, unknown> = {
      DiscountPercent: line.discount ?? 0,
      ItemCode: line.itemCode,
      Quantity: line.quantity,
      UnitPrice: line.unitPrice ?? 0,
    };
    // Only set when resolved to a real seller VAT group. Empty → omit so SAP
    // uses customer/item default tax (avoids "Invalid VAT Group" from buyer codes).
    if (targetTax) {
      docLine.VatGroup = targetTax;
    }

    const itemWh = resolveLineWarehouse
      ? ((await resolveLineWarehouse({ itemCode: line.itemCode ?? "" }))?.trim() ?? null)
      : null;
    const warehouseCode = itemWh || branchWh;
    if (warehouseCode) {
      docLine.WarehouseCode = warehouseCode;
    }

    if (line.uomCode) {
      docLine.UoMCode = line.uomCode;
      docLine.UseBaseUnit = "tNO";
    }
    if (line.deliveryDate) {
      docLine.ShipDate = line.deliveryDate;
    }
    result.push(docLine);
  }
  return result;
};

/**
 * When document BPL is set, resolve a seller WH on that BPL so SAP does not
 * default to an item WH on a different branch (e.g. L101 on BPL 7 vs doc BPL 1).
 */
export const resolveSqWarehouseContext = async (params: {
  sapDbName?: string | null;
  defaultBranchId?: number | null;
  warehouseMasters?: PartnerWarehouseMasters;
}): Promise<{
  branchId: number | null;
  branchWarehouseCode: string | null;
  resolveLineWarehouse?: ResolveSqLineWarehouse;
}> => {
  const branchIdRaw = params.defaultBranchId;
  const branchId =
    branchIdRaw != null && Number.isFinite(branchIdRaw) && branchIdRaw > 0
      ? Math.trunc(branchIdRaw)
      : null;
  const sapDbName = params.sapDbName?.trim() || null;
  if (branchId == null || !sapDbName) {
    return { branchId, branchWarehouseCode: null };
  }

  const masters = params.warehouseMasters ?? partnerWarehouseMasters;
  const branchWarehouseCode = await masters.getWarehouseForBranch(sapDbName, branchId);

  return {
    branchId,
    branchWarehouseCode,
    resolveLineWarehouse: async ({ itemCode }) =>
      masters.getItemWarehouseOnBranch(sapDbName, itemCode, branchId),
  };
};

export const createSellerSq = async (params: {
  documents: IcSlDocuments;
  sellerCompanyId: number;
  buyerCustomerCode: string;
  lines: IcRfqLine[];
  remarks: string;
  resolveLineTax: ResolveSqLineTax;
  /** IC_COMPANY.DEFAULT_BRANCH_ID for seller — required when multi-branch is active. */
  defaultBranchId?: number | null;
  /** Seller SAP company DB (IC_COMPANY.SAP_DB_NAME) for OWHS lookup. */
  sapDbName?: string | null;
  warehouseMasters?: PartnerWarehouseMasters;
}): Promise<IcSlDocumentResult> => {
  const warehouseCtx = await resolveSqWarehouseContext({
    defaultBranchId: params.defaultBranchId,
    sapDbName: params.sapDbName,
    warehouseMasters: params.warehouseMasters,
  });

  if (warehouseCtx.branchId != null && !warehouseCtx.branchWarehouseCode) {
    icLog.warn(IC_LOG_SCOPE.FLOW1, "No active warehouse on seller branch for SQ", {
      check: "sq_branch_warehouse",
      defaultBranchId: warehouseCtx.branchId,
      outcome: "fail",
      sapDbName: params.sapDbName ?? null,
      sellerCompanyId: params.sellerCompanyId,
    });
    throw new Error(
      `No active warehouse on branch ${warehouseCtx.branchId} in ${params.sapDbName ?? "seller DB"}; ` +
        `cannot create SQ with BPL_IDAssignedToInvoice (set OWHS.BPLid or DEFAULT_BRANCH_ID)`,
    );
  }

  const documentLines = await buildSalesQuotationLines(params.lines, params.resolveLineTax, {
    branchWarehouseCode: warehouseCtx.branchWarehouseCode,
    resolveLineWarehouse: warehouseCtx.resolveLineWarehouse,
  });

  icLog.info(IC_LOG_SCOPE.FLOW1, "Flow 1 SQ lines prepared for seller", {
    branchWarehouseCode: warehouseCtx.branchWarehouseCode,
    check: "sq_lines_vat",
    defaultBranchId: params.defaultBranchId ?? null,
    lineCount: documentLines.length,
    lines: documentLines.map((line, index) => ({
      itemCode: line.ItemCode ?? null,
      lineNum: index,
      quantity: line.Quantity ?? null,
      unitPrice: line.UnitPrice ?? null,
      vatGroup: line.VatGroup ?? null,
      warehouseCode: line.WarehouseCode ?? null,
    })),
    outcome: "pass",
    sapDbName: params.sapDbName ?? null,
    sellerCompanyId: params.sellerCompanyId,
  });

  return params.documents.createSalesQuotation({
    cardCode: params.buyerCustomerCode,
    companyId: params.sellerCompanyId,
    defaultBranchId: params.defaultBranchId,
    lines: documentLines,
    remarks: params.remarks,
  });
};
