/**
 * Read company-local tax defaults from SAP tenant DB (HANA).
 * No IC_TAX_MAPPING — tax is always resolved in the document's company.
 */

import { executeTenantQuery } from "@/db/tenant-query";

/** Sales docs (SQ, AR) vs purchase docs (if ever created on partner for AP). */
export type PartnerTaxDocSide = "sales" | "purchase";

export type PartnerTaxMasters = {
  getItemTax: (
    sapDbName: string,
    itemCode: string,
    side: PartnerTaxDocSide,
  ) => Promise<string | null>;
  getBpTax: (
    sapDbName: string,
    cardCode: string,
    side: PartnerTaxDocSide,
  ) => Promise<string | null>;
};

const toTax = (value: unknown): string | null => {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  return text || null;
};

export const createPartnerTaxMasters = (deps?: {
  queryTenant?: (dbName: string, query: string, parameters?: unknown[]) => Promise<unknown>;
}): PartnerTaxMasters => {
  const queryTenant = deps?.queryTenant ?? executeTenantQuery;

  return {
    getItemTax: async (sapDbName, itemCode, side) => {
      const db = sapDbName.trim();
      const code = itemCode.trim();
      if (!db || !code) {
        return null;
      }
      try {
        // OITM: sales = VatGourpSa (SAP historical spelling); purchase = VatGroupPu
        const rows = (await queryTenant(
          db,
          `SELECT "VatGourpSa" AS "VatGroupSa", "VatGroupPu"
             FROM "OITM"
            WHERE "ItemCode" = ?`,
          [code],
        )) as Array<Record<string, unknown>>;
        const row = rows[0];
        if (!row) {
          return null;
        }
        if (side === "purchase") {
          return toTax(row.VatGroupPu ?? row.vatGroupPu);
        }
        return toTax(row.VatGroupSa ?? row.vatGroupSa ?? row.VatGourpSa);
      } catch {
        return null;
      }
    },

    getBpTax: async (sapDbName, cardCode, side) => {
      const db = sapDbName.trim();
      const code = cardCode.trim();
      if (!db || !code) {
        return null;
      }
      try {
        // OCRD.ECVatGroup is the common default VAT group on the BP (sales-oriented).
        // Used for sales partner docs; also a last resort for purchase if set.
        const rows = (await queryTenant(
          db,
          `SELECT "ECVatGroup"
             FROM "OCRD"
            WHERE "CardCode" = ?`,
          [code],
        )) as Array<Record<string, unknown>>;
        const row = rows[0];
        if (!row) {
          return null;
        }
        const tax = toTax(row.ECVatGroup ?? row.ecVatGroup ?? row.EcvatGroup);
        if (side === "purchase" && !tax) {
          return null;
        }
        return tax;
      } catch {
        return null;
      }
    },
  };
};

export const partnerTaxMasters = createPartnerTaxMasters();
