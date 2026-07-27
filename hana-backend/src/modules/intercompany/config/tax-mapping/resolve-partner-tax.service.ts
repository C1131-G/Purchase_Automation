/**
 * Company-local partner tax resolution (no IC_TAX_MAPPING).
 *
 * For seller sales docs (SQ, AR draft):
 *   1. Item tax on target company (OITM.VatGourpSa)
 *   2. BP default on target company (OCRD.ECVatGroup)
 *   3. omit VatGroup — SAP determination on POST
 *
 * Never copies buyer purchase tax onto seller sales lines.
 */

import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";

import {
  createPartnerTaxMasters,
  type PartnerTaxDocSide,
  type PartnerTaxMasters,
} from "./partner-tax.masters";

export type PartnerTaxSource = "item" | "bp" | "omit";

export type ResolvePartnerTaxInput = {
  /** Company where the document is posted (seller for SQ/AR). */
  targetCompanyId: number;
  itemCode?: string | null;
  /** CardCode on the target company (customer for sales docs). */
  targetCardCode?: string | null;
  /** Optional; loaded from IC_COMPANY when omitted. */
  targetSapDbName?: string | null;
  /**
   * sales = SQ / AR (default). purchase = future partner purchase docs.
   * Selects item purchase vs sales VAT column.
   */
  docSide?: PartnerTaxDocSide;
  /** @deprecated Ignored — kept for call-site compatibility during migration. */
  sourceCompanyId?: number;
  /** @deprecated Ignored — never used as seller VatGroup. */
  sourceTaxCode?: string | null;
};

export type ResolvePartnerTaxResult = {
  /** Empty string → omit VatGroup on partner document line. */
  taxCode: string;
  source: PartnerTaxSource;
  docSide: PartnerTaxDocSide;
};

export type PartnerTaxResolver = {
  resolve: (input: ResolvePartnerTaxInput) => Promise<ResolvePartnerTaxResult>;
  resolveLineTax: (input: ResolvePartnerTaxInput) => Promise<string>;
};

export const createPartnerTaxResolver = (deps?: {
  company?: CompanyService;
  masters?: PartnerTaxMasters;
}): PartnerTaxResolver => {
  const company = deps?.company ?? createCompanyService();
  const masters = deps?.masters ?? createPartnerTaxMasters();

  const itemCache = new Map<string, string | null>();
  const bpCache = new Map<string, string | null>();
  const dbCache = new Map<number, string | null>();

  const resolveTargetDb = async (
    targetCompanyId: number,
    explicit?: string | null,
  ): Promise<string | null> => {
    const fromInput = explicit?.trim() || "";
    if (fromInput) {
      return fromInput;
    }
    if (dbCache.has(targetCompanyId)) {
      return dbCache.get(targetCompanyId) ?? null;
    }
    const row = await company.getById(targetCompanyId);
    const dbName = row?.sapDbName?.trim() || null;
    dbCache.set(targetCompanyId, dbName);
    return dbName;
  };

  const resolve: PartnerTaxResolver["resolve"] = async (input) => {
    const docSide: PartnerTaxDocSide = input.docSide ?? "sales";
    const itemCode = input.itemCode?.trim() ?? "";
    const cardCode = input.targetCardCode?.trim() ?? "";
    const sapDb = await resolveTargetDb(input.targetCompanyId, input.targetSapDbName);

    // 1) Item tax on document company (sales vs purchase column)
    if (sapDb && itemCode) {
      const cacheKey = `${sapDb}|${docSide}|item|${itemCode}`;
      let itemTax: string | null;
      if (itemCache.has(cacheKey)) {
        itemTax = itemCache.get(cacheKey) ?? null;
      } else {
        itemTax = await masters.getItemTax(sapDb, itemCode, docSide);
        itemCache.set(cacheKey, itemTax);
      }
      if (itemTax) {
        icLog.info(IC_LOG_SCOPE.TAX, "IC partner tax from item master", {
          check: "tax_resolve",
          docSide,
          itemCode,
          outcome: "pass",
          source: "item",
          targetCompanyId: input.targetCompanyId,
          targetTaxCode: itemTax,
        });
        return { docSide, source: "item", taxCode: itemTax };
      }
    }

    // 2) BP default on document company
    if (sapDb && cardCode) {
      const cacheKey = `${sapDb}|${docSide}|bp|${cardCode}`;
      let bpTax: string | null;
      if (bpCache.has(cacheKey)) {
        bpTax = bpCache.get(cacheKey) ?? null;
      } else {
        bpTax = await masters.getBpTax(sapDb, cardCode, docSide);
        bpCache.set(cacheKey, bpTax);
      }
      if (bpTax) {
        icLog.info(IC_LOG_SCOPE.TAX, "IC partner tax from BP master", {
          check: "tax_resolve",
          docSide,
          outcome: "pass",
          source: "bp",
          targetCardCode: cardCode,
          targetCompanyId: input.targetCompanyId,
          targetTaxCode: bpTax,
        });
        return { docSide, source: "bp", taxCode: bpTax };
      }
    }

    // 3) Omit — SAP determination on POST
    icLog.warn(IC_LOG_SCOPE.TAX, "IC partner tax omit VatGroup (item/BP miss)", {
      check: "tax_resolve",
      docSide,
      hint: "Set OITM.VatGourpSa (sales) / VatGroupPu (purchase) or OCRD.ECVatGroup on document company",
      itemCode: itemCode || null,
      outcome: "fail",
      source: "omit",
      targetCardCode: cardCode || null,
      targetCompanyId: input.targetCompanyId,
      targetSapDb: sapDb,
    });
    return { docSide, source: "omit", taxCode: "" };
  };

  return {
    resolve,
    resolveLineTax: async (input) => (await resolve(input)).taxCode,
  };
};

export const partnerTaxResolver = createPartnerTaxResolver();
