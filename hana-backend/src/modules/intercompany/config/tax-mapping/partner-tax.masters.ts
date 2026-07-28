/**
 * Read company-local tax defaults from SAP tenant DB (HANA).
 * OVTG rate/category used for cross-company PQ→SQ and PO→AR tax mapping.
 */

import { executeTenantQuery } from "@/db/tenant-query";

import { normalizeOvtgCategory, type OvtgTaxRecord } from "./map-ovtg-partner-tax";

/** Sales docs (SQ, AR) vs purchase docs (PQ, PO). */
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
  getOvtgTax: (sapDbName: string, taxCode: string) => Promise<OvtgTaxRecord | null>;
  listOvtgTaxes: (sapDbName: string) => Promise<OvtgTaxRecord[]>;
};

const toTax = (value: unknown): string | null => {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  return text || null;
};

const mapOvtgRow = (row: Record<string, unknown>): OvtgTaxRecord | null => {
  const code = toTax(row.Code ?? row.code);
  if (!code) {
    return null;
  }
  const rate = Number(row.Rate ?? row.rate);
  if (!Number.isFinite(rate)) {
    return null;
  }
  return {
    category: normalizeOvtgCategory(row.Category ?? row.category),
    code,
    rate,
  };
};

const isActiveOvtgRow = (row: Record<string, unknown>): boolean => {
  const inactive = String(row.Inactive ?? row.inactive ?? "N")
    .trim()
    .toUpperCase();
  return inactive !== "Y";
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

    getOvtgTax: async (sapDbName, taxCode) => {
      const db = sapDbName.trim();
      const code = taxCode.trim();
      if (!db || !code) {
        return null;
      }
      try {
        const rows = (await queryTenant(
          db,
          `SELECT "Code", "Name", "Category", "Rate", "Inactive"
             FROM "OVTG"
            WHERE "Code" = ?`,
          [code],
        )) as Array<Record<string, unknown>>;
        const row = rows.find(isActiveOvtgRow);
        return row ? mapOvtgRow(row) : null;
      } catch {
        return null;
      }
    },

    listOvtgTaxes: async (sapDbName) => {
      const db = sapDbName.trim();
      if (!db) {
        return [];
      }
      try {
        const rows = (await queryTenant(
          db,
          `SELECT "Code", "Name", "Category", "Rate", "Inactive"
             FROM "OVTG"
            WHERE COALESCE("Inactive", 'N') = 'N'`,
        )) as Array<Record<string, unknown>>;
        return rows.map(mapOvtgRow).filter((row): row is OvtgTaxRecord => row !== null);
      } catch {
        return [];
      }
    },
  };
};

export const partnerTaxMasters = createPartnerTaxMasters();
