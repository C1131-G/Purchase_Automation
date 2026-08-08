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
import { resolveDocumentSeries } from "@/modules/master-data/master-data.service";
import {
  resolveUomOnTenant,
  type ResolvedTenantUom,
} from "@/modules/master-data/master-data.warehouses-series.queries";

/** Resolve seller VatGroup for one SQ line (empty string → omit field). */
export type ResolveSqLineTax = (input: {
  sourceTaxCode: string;
  itemCode: string;
}) => Promise<string>;

/**
 * Build SQ lines for the seller company.
 * - VatGroup only when resolver returns a **seller** tax code (never buyer tax).
 * - Warehouse: resolved once (PQ WH if on seller, else default/fallback branch WH).
 *   Do not change warehouse again after resolve. No item-WH switch.
 * - UoM: keep buyer PQ/RFQ line UoM only. Never replace with OITM.SalUnitMsr
 *   (item sales default) when WH/branch is resolved — that was rewriting UoM.
 */
export type BuildSqLinesResult = {
  documentLines: Record<string, unknown>[];
  /** Explicit PQ vs SQ tax per line (what IC used). */
  taxUsage: IcLineTaxUsage[];
};

/** First non-empty warehouse from RFQ/PQ lines (buyer PQ warehouse code). */
export const pickPqWarehouseCode = (lines: IcRfqLine[]): string | null => {
  for (const line of lines) {
    const warehouseCode = line.warehouse?.trim();
    if (warehouseCode) {
      return warehouseCode;
    }
  }
  return null;
};

export const buildSalesQuotationLines = async (
  lines: IcRfqLine[],
  resolveLineTax: ResolveSqLineTax,
  options?: {
    /** WH for the document branch (all lines share this). */
    branchWarehouseCode?: string | null;
    /**
     * Seller SAP DB — when set, resolve UoMEntry on seller books for the RFQ UoMCode.
     * Without UoMEntry, Service Layer often posts Manual instead of Each/NOS/etc.
     */
    sapDbName?: string | null;
    /**
     * Optional UoM resolver (injectable in unit tests).
     * Buyer UoMEntry is never trusted — always resolve on seller.
     */
    resolveUom?: (input: {
      itemCode: string;
      uomCode: string;
    }) => Promise<ResolvedTenantUom | null>;
    /** @deprecated Prefer resolveUom — kept for older unit tests. */
    resolveUomEntry?: (uomCode: string) => Promise<number | null>;
  },
): Promise<BuildSqLinesResult> => {
  const branchWh = options?.branchWarehouseCode?.trim() || null;
  const documentLines: Record<string, unknown>[] = [];
  const taxUsage: IcLineTaxUsage[] = [];
  const sapDbName = options?.sapDbName?.trim() || null;
  const resolveUom =
    options?.resolveUom ??
    (async (input: { itemCode: string; uomCode: string }): Promise<ResolvedTenantUom | null> => {
      if (options?.resolveUomEntry) {
        const entry = await options.resolveUomEntry(input.uomCode);
        return {
          uomCode: input.uomCode,
          uomEntry: entry != null && entry > 0 ? entry : null,
        };
      }
      return sapDbName
        ? resolveUomOnTenant(sapDbName, { itemCode: input.itemCode, uomCode: input.uomCode })
        : null;
    });

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

    // Fixed resolved WH for the document — do not flip per line or from item master.
    if (branchWh) {
      docLine.WarehouseCode = branchWh;
    }

    // Keep RFQ/PQ UoM code, but always re-resolve UoMEntry on seller SAP.
    // Buyer UoMEntry is not portable; missing seller UoMEntry → SAP posts Manual.
    const sourceUom = line.uomCode?.trim() || null;
    if (sourceUom) {
      const resolved = await resolveUom({
        itemCode: String(line.itemCode ?? "").trim(),
        uomCode: sourceUom,
      });
      const sellerCode = resolved?.uomCode?.trim() || sourceUom;
      docLine.UoMCode = sellerCode;
      if (resolved?.uomEntry != null && resolved.uomEntry > 0) {
        docLine.UoMEntry = resolved.uomEntry;
      }
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
 * SQ warehouse + branch (buyer WH codes rarely exist on seller books):
 * 1. If PQ warehouse exists on seller OWHS → use it (BPL from WH when set)
 * 2. Else DEFAULT_BRANCH_ID / OBPL default warehouse
 * 3. Else first active branch+WH with BPLid
 * 4. Else any active WH (BPL optional — Ajax-style single-branch)
 * Never pick from item default warehouse.
 */
export const resolveSqWarehouseContext = async (params: {
  sapDbName?: string | null;
  defaultBranchId?: number | null;
  /** Buyer PQ / RFQ line warehouse code — prefer when present on seller books. */
  pqWarehouseCode?: string | null;
  warehouseMasters?: PartnerWarehouseMasters;
}): Promise<{
  branchId: number | null;
  branchWarehouseCode: string | null;
  /** true when document BPL is not DEFAULT_BRANCH_ID */
  switchedFromDefault: boolean;
  /** How warehouse was chosen */
  source:
    | "pq_warehouse"
    | "default_branch"
    | "fallback_branch"
    | "any_warehouse"
    | "obpl_default"
    | "none";
}> => {
  const preferredBranchRaw = params.defaultBranchId;
  let preferredBranchId =
    preferredBranchRaw != null && Number.isFinite(preferredBranchRaw) && preferredBranchRaw > 0
      ? Math.trunc(preferredBranchRaw)
      : null;
  const sapDbName = params.sapDbName?.trim() || null;
  const pqWarehouseCode = params.pqWarehouseCode?.trim() || null;

  if (!sapDbName) {
    return {
      branchId: preferredBranchId,
      branchWarehouseCode: null,
      source: "none",
      switchedFromDefault: false,
    };
  }

  const masters = params.warehouseMasters ?? partnerWarehouseMasters;

  // 0) IC_COMPANY.DEFAULT_BRANCH_ID may be unset — use first active OBPL on seller DB.
  if (preferredBranchId == null && masters.getDefaultObplBranch) {
    preferredBranchId = await masters.getDefaultObplBranch(sapDbName);
  }

  // 1) PQ warehouse on seller → switch branch to match that WH (keep mother default on IC_COMPANY).
  if (pqWarehouseCode) {
    const fromPq = await masters.resolveWarehouseIfExists(sapDbName, pqWarehouseCode);
    if (fromPq) {
      return {
        branchId: fromPq.branchId ?? preferredBranchId,
        branchWarehouseCode: fromPq.warehouseCode,
        source: "pq_warehouse",
        switchedFromDefault:
          preferredBranchId != null &&
          fromPq.branchId != null &&
          preferredBranchId !== fromPq.branchId,
      };
    }
  }

  // 2) Default branch (IC_COMPANY or OBPL) warehouse.
  if (preferredBranchId != null) {
    const onDefault = await masters.getWarehouseForBranch(sapDbName, preferredBranchId);
    if (onDefault) {
      return {
        branchId: preferredBranchId,
        branchWarehouseCode: onDefault,
        source:
          params.defaultBranchId != null && Number(params.defaultBranchId) === preferredBranchId
            ? "default_branch"
            : "obpl_default",
        switchedFromDefault: false,
      };
    }
  }

  // 3) First active WH that has a BPL (multi-branch sellers).
  const fallback = await masters.getFirstActiveBranchWarehouse(sapDbName);
  if (fallback) {
    return {
      branchId: fallback.branchId,
      branchWarehouseCode: fallback.warehouseCode,
      source: "fallback_branch",
      switchedFromDefault:
        preferredBranchId != null &&
        fallback.branchId != null &&
        preferredBranchId !== fallback.branchId,
    };
  }

  // 4) Any active WH — single-branch / BPLid-null OWHS (common on Ajax).
  if (masters.getFirstActiveWarehouse) {
    const anyWh = await masters.getFirstActiveWarehouse(sapDbName);
    if (anyWh) {
      return {
        branchId: anyWh.branchId ?? preferredBranchId,
        branchWarehouseCode: anyWh.warehouseCode,
        source: "any_warehouse",
        switchedFromDefault:
          preferredBranchId != null &&
          anyWh.branchId != null &&
          preferredBranchId !== anyWh.branchId,
      };
    }
  }

  return {
    branchId: preferredBranchId,
    branchWarehouseCode: null,
    source: "none",
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
  /** Buyer PQ vendor ref (NumAtCard) — set on seller SQ. */
  numAtCard?: string | null;
  resolveLineTax: ResolveSqLineTax;
  /** IC_COMPANY.DEFAULT_BRANCH_ID for seller (e.g. 1) — preferred when PQ WH not on seller. */
  defaultBranchId?: number | null;
  /** Seller SAP company DB (IC_COMPANY.SAP_DB_NAME) for OWHS lookup. */
  sapDbName?: string | null;
  /** Optional explicit PQ warehouse; defaults to first RFQ line warehouse. */
  pqWarehouseCode?: string | null;
  warehouseMasters?: PartnerWarehouseMasters;
}): Promise<CreateSellerSqResult> => {
  const pqWarehouseCode =
    params.pqWarehouseCode?.trim() || pickPqWarehouseCode(params.lines) || null;

  const warehouseCtx = await resolveSqWarehouseContext({
    defaultBranchId: params.defaultBranchId,
    pqWarehouseCode,
    sapDbName: params.sapDbName,
    warehouseMasters: params.warehouseMasters,
  });

  if (warehouseCtx.switchedFromDefault || warehouseCtx.source === "pq_warehouse") {
    icLog.info(IC_LOG_SCOPE.FLOW1, "SQ warehouse/branch resolved", {
      check: "sq_branch_resolve",
      defaultBranchId: params.defaultBranchId ?? null,
      outcome: "pass",
      pqWarehouseCode,
      resolvedBranchId: warehouseCtx.branchId,
      resolvedWarehouse: warehouseCtx.branchWarehouseCode,
      sapDbName: params.sapDbName ?? null,
      sellerCompanyId: params.sellerCompanyId,
      source: warehouseCtx.source,
      switchedFromDefault: warehouseCtx.switchedFromDefault,
    });
  }

  // Need a seller-side warehouse for inventory lines. Buyer PQ WH is only a hint —
  // when it is missing on seller, fallbacks above must supply any active OWHS.
  // BPL may stay null on single-branch tenants (Ajax); SL omits BPL_IDAssignedToInvoice then.
  if (!warehouseCtx.branchWarehouseCode) {
    icLog.warn(IC_LOG_SCOPE.FLOW1, "No active warehouse on seller company for SQ", {
      check: "sq_branch_warehouse",
      defaultBranchId: params.defaultBranchId ?? null,
      outcome: "fail",
      pqWarehouseCode,
      resolvedBranchId: warehouseCtx.branchId,
      sapDbName: params.sapDbName ?? null,
      sellerCompanyId: params.sellerCompanyId,
      source: warehouseCtx.source,
    });
    throw new Error(
      `No active warehouse in ${params.sapDbName ?? "seller DB"}` +
        (pqWarehouseCode ? ` (PQ WH ${pqWarehouseCode} not on seller; ` : " (") +
        `no active OWHS after default/OBPL/fallback); cannot create seller SQ`,
    );
  }

  const { documentLines, taxUsage } = await buildSalesQuotationLines(
    params.lines,
    params.resolveLineTax,
    {
      branchWarehouseCode: warehouseCtx.branchWarehouseCode,
      sapDbName: params.sapDbName,
    },
  );

  // Document BPL follows warehouse (PQ WH or fallback). Mother default stays on IC_COMPANY.
  const documentBranchId = warehouseCtx.branchId ?? params.defaultBranchId ?? null;

  // Number series for SQ (Obj 23) on document branch → SAP NextNumber alignment.
  // Skip live NNM1 under Vitest (memory IC SQL only; tenant HANA hangs/fails).
  const seriesResolve =
    params.sapDbName && process.env.VITEST !== "true"
      ? await resolveDocumentSeries(params.sapDbName, "23", { branchId: documentBranchId })
      : null;

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
      uomCode: line.UoMCode ?? null,
      uomEntry: line.UoMEntry ?? null,
      vatGroup: line.VatGroup ?? null,
      warehouseCode: line.WarehouseCode ?? null,
    })),
    outcome: "pass",
    pqWarehouseCode,
    sapDbName: params.sapDbName ?? null,
    sellerCompanyId: params.sellerCompanyId,
    series: seriesResolve?.series ?? null,
    seriesNextNumber: seriesResolve?.nextNumber ?? null,
    seriesSource: seriesResolve?.source ?? null,
    source: warehouseCtx.source,
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
    series: seriesResolve?.series ?? null,
  });
  return { ...created, taxUsage };
};
