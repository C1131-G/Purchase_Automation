/**
 * Company-local partner tax resolution (no IC_TAX_MAPPING table).
 *
 * Cross-company IC (PQ→SQ, PO→AR):
 *   1. OVTG rate match — buyer purchase tax (Category I) → seller sales tax (Category O)
 *      at the same Rate (e.g. IN-12.5 @ 12.5% → OUT-12.5 @ 12.5%).
 *
 * Fallback on target company:
 *   2. Item tax (OITM)
 *   3. BP default (OCRD)
 *   4. omit VatGroup — SAP determination on POST
 */

import type { CompanyService } from "@/modules/intercompany/config/company/company.service";
import { createCompanyService } from "@/modules/intercompany/config/company/company.service";
import { IC_LOG_SCOPE, icLog } from "@/modules/intercompany/infrastructure/ic-logger";

import { mapTaxCodeByOvtgRate } from "./map-ovtg-partner-tax";
import {
  createPartnerTaxMasters,
  type PartnerTaxDocSide,
  type PartnerTaxMasters,
} from "./partner-tax.masters";

export type PartnerTaxSource = "ovtg_rate" | "item" | "bp" | "omit";

export type ResolvePartnerTaxInput = {
  /** Company where the document is posted (seller for SQ/AR). */
  targetCompanyId: number;
  itemCode?: string | null;
  /** CardCode on the target company (customer for sales docs). */
  targetCardCode?: string | null;
  /** Optional; loaded from IC_COMPANY when omitted. */
  targetSapDbName?: string | null;
  /** Buyer/source company for OVTG lookup (PQ/PO tax). */
  sourceCompanyId?: number;
  /** Optional; loaded from IC_COMPANY when omitted. */
  sourceSapDbName?: string | null;
  /** Buyer PQ/PO line VatGroup — matched to seller OVTG by rate + category. */
  sourceTaxCode?: string | null;
  /**
   * sales = SQ / AR (default). purchase = partner purchase docs.
   * Selects target OVTG Category (O vs I) for rate matching.
   */
  docSide?: PartnerTaxDocSide;
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
  const ovtgTaxCache = new Map<string, ReturnType<PartnerTaxMasters["getOvtgTax"]>>();
  const ovtgListCache = new Map<string, ReturnType<PartnerTaxMasters["listOvtgTaxes"]>>();

  const resolveCompanyDb = async (
    companyId: number,
    explicit?: string | null,
  ): Promise<string | null> => {
    const fromInput = explicit?.trim() || "";
    if (fromInput) {
      return fromInput;
    }
    if (dbCache.has(companyId)) {
      return dbCache.get(companyId) ?? null;
    }
    const row = await company.getById(companyId);
    const dbName = row?.sapDbName?.trim() || null;
    dbCache.set(companyId, dbName);
    return dbName;
  };

  const resolveTargetDb = async (
    targetCompanyId: number,
    explicit?: string | null,
  ): Promise<string | null> => resolveCompanyDb(targetCompanyId, explicit);

  const resolve: PartnerTaxResolver["resolve"] = async (input) => {
    const docSide: PartnerTaxDocSide = input.docSide ?? "sales";
    const itemCode = input.itemCode?.trim() ?? "";
    const cardCode = input.targetCardCode?.trim() ?? "";
    const sourceTaxCode = input.sourceTaxCode?.trim() ?? "";
    const targetSapDb = await resolveTargetDb(input.targetCompanyId, input.targetSapDbName);

    // 0) OVTG rate/category match across companies (PQ→SQ, PO→AR).
    if (sourceTaxCode && input.sourceCompanyId && targetSapDb) {
      const sourceSapDb = await resolveCompanyDb(input.sourceCompanyId, input.sourceSapDbName);
      if (sourceSapDb) {
        const sourceCacheKey = `${sourceSapDb}|${sourceTaxCode}`;
        let sourceTaxPromise = ovtgTaxCache.get(sourceCacheKey);
        if (!sourceTaxPromise) {
          sourceTaxPromise = masters.getOvtgTax(sourceSapDb, sourceTaxCode);
          ovtgTaxCache.set(sourceCacheKey, sourceTaxPromise);
        }
        const sourceTax = await sourceTaxPromise;

        let targetTaxesPromise = ovtgListCache.get(targetSapDb);
        if (!targetTaxesPromise) {
          targetTaxesPromise = masters.listOvtgTaxes(targetSapDb);
          ovtgListCache.set(targetSapDb, targetTaxesPromise);
        }
        const targetTaxes = await targetTaxesPromise;
        const mappedTax = mapTaxCodeByOvtgRate({
          sourceTax,
          targetDocSide: docSide,
          targetTaxes,
        });

        if (mappedTax) {
          icLog.info(IC_LOG_SCOPE.TAX, "IC partner tax from OVTG rate match", {
            check: "tax_resolve",
            docSide,
            outcome: "pass",
            source: "ovtg_rate",
            sourceCompanyId: input.sourceCompanyId,
            sourceTaxCode,
            targetCompanyId: input.targetCompanyId,
            targetTaxCode: mappedTax,
          });
          return { docSide, source: "ovtg_rate", taxCode: mappedTax };
        }
      }
    }

    // 1) Item tax on document company (sales vs purchase column)
    if (targetSapDb && itemCode) {
      const cacheKey = `${targetSapDb}|${docSide}|item|${itemCode}`;
      let itemTax: string | null;
      if (itemCache.has(cacheKey)) {
        itemTax = itemCache.get(cacheKey) ?? null;
      } else {
        itemTax = await masters.getItemTax(targetSapDb, itemCode, docSide);
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
    if (targetSapDb && cardCode) {
      const cacheKey = `${targetSapDb}|${docSide}|bp|${cardCode}`;
      let bpTax: string | null;
      if (bpCache.has(cacheKey)) {
        bpTax = bpCache.get(cacheKey) ?? null;
      } else {
        bpTax = await masters.getBpTax(targetSapDb, cardCode, docSide);
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
      targetSapDb: targetSapDb,
    });
    return { docSide, source: "omit", taxCode: "" };
  };

  return {
    resolve,
    resolveLineTax: async (input) => (await resolve(input)).taxCode,
  };
};

export const partnerTaxResolver = createPartnerTaxResolver();
