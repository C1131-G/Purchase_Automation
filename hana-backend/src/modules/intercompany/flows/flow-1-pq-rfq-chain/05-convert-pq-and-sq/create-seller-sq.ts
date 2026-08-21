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
 * - Warehouse: RFQ line only (OSCN.U_Warehouse matched on seller, or seller-edited).
 *   Convert does not copy buyer PQ warehouse. Do not change warehouse again after resolve.
 * - UoM: RFQ line only (seller sales UoM stored on RFQ). Convert does not
 *   re-pick item-master UoM. Resolve UoMEntry on seller books by code/name.
 */
export type BuildSqLinesResult = {
  documentLines: Record<string, unknown>[];
  /** Explicit PQ vs SQ tax per line (what IC used). */
  taxUsage: IcLineTaxUsage[];
};

/** First non-empty warehouse from RFQ lines (seller OSCN / seller-edited). */
export const pickRfqWarehouseCode = (lines: IcRfqLine[]): string | null => {
  for (const line of lines) {
    const warehouseCode = line.warehouse?.trim();
    if (warehouseCode) {
      return warehouseCode;
    }
  }
  return null;
};

/** @deprecated Use pickRfqWarehouseCode — RFQ warehouse is seller-side, not buyer PQ. */
export const pickPqWarehouseCode = pickRfqWarehouseCode;

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
     * Uses RFQ UoMCode; buyer UoMEntry is never trusted — resolve entry on seller.
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

    // RFQ UoM only (seller sales stored on RFQ). Do not re-pick item master here.
    // Buyer UoMEntry is not portable; missing seller UoMEntry → SAP posts Manual.
    const itemCode = String(line.itemCode ?? "").trim();
    const sourceUom = line.sqUomCode?.trim() || line.uomCode?.trim() || "";
    if (sourceUom && !/^manual$/i.test(sourceUom)) {
      const resolved = await resolveUom({
        itemCode,
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
 * SQ warehouse + branch:
 * 1. If RFQ warehouse exists on seller OWHS → use it (BPL from WH when set)
 * 2. Else DEFAULT_BRANCH_ID / OBPL default warehouse
 * 3. Else first active branch+WH with BPLid
 * 4. Else any active WH (BPL optional — Ajax-style single-branch)
 * Never pick from item default warehouse. Never copy buyer PQ warehouse here.
 */
export const resolveSqWarehouseContext = async (params: {
  sapDbName?: string | null;
  defaultBranchId?: number | null;
  /** RFQ seller warehouse code — prefer when present on seller books. */
  pqWarehouseCode?: string | null;
  warehouseMasters?: PartnerWarehouseMasters;
}): Promise<{
  branchId: number | null;
  branchWarehouseCode: string | null;
  /** true when document BPL is not DEFAULT_BRANCH_ID */
  switchedFromDefault: boolean;
  /** How warehouse was chosen */
  source:
    | "rfq_warehouse"
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

  // 1) RFQ warehouse on seller → switch branch to match that WH (keep mother default on IC_COMPANY).
  if (pqWarehouseCode) {
    const fromRfq =
      (await masters.resolveWarehouseByCodeOrName?.(sapDbName, pqWarehouseCode)) ??
      (await masters.resolveWarehouseIfExists(sapDbName, pqWarehouseCode));
    if (fromRfq) {
      return {
        branchId: fromRfq.branchId ?? preferredBranchId,
        branchWarehouseCode: fromRfq.warehouseCode,
        source: "rfq_warehouse",
        switchedFromDefault:
          preferredBranchId != null &&
          fromRfq.branchId != null &&
          preferredBranchId !== fromRfq.branchId,
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
  /** Optional explicit RFQ warehouse; defaults to first RFQ line warehouse. */
  pqWarehouseCode?: string | null;
  /** Server-derived U_CreatedBy value from the portal user who initiated conversion. */
  portalCreatedBy?: string;
  warehouseMasters?: PartnerWarehouseMasters;
}): Promise<CreateSellerSqResult> => {
  const pqWarehouseCode =
    params.pqWarehouseCode?.trim() || pickRfqWarehouseCode(params.lines) || null;

  const warehouseCtx = await resolveSqWarehouseContext({
    defaultBranchId: params.defaultBranchId,
    pqWarehouseCode,
    sapDbName: params.sapDbName,
    warehouseMasters: params.warehouseMasters,
  });

  if (
    warehouseCtx.switchedFromDefault ||
    warehouseCtx.source === "rfq_warehouse" ||
    warehouseCtx.source === "pq_warehouse"
  ) {
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
        (pqWarehouseCode ? ` (RFQ WH ${pqWarehouseCode} not on seller; ` : " (") +
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
    portalCreatedBy: params.portalCreatedBy,
    remarks: params.remarks,
    series: seriesResolve?.series ?? null,
  });
  return { ...created, taxUsage };
};
