/**
 * Resolve seller warehouses for multi-branch SAP companies.
 * Used when IC sets BPL_IDAssignedToInvoice — line WH must share that BPL.
 */

import { executeTenantQuery } from "@/db/tenant-query";

export type PartnerWarehouseMasters = {
  /**
   * First active warehouse on the given business place (OWHS.BPLid).
   * Used as document-level default for auto SQ lines.
   */
  getWarehouseForBranch: (sapDbName: string, branchId: number) => Promise<string | null>;
  /**
   * Item default WH only when that WH is active and assigned to the branch.
   * Prefer over generic branch WH when available.
   */
  getItemWarehouseOnBranch: (
    sapDbName: string,
    itemCode: string,
    branchId: number,
  ) => Promise<string | null>;
};

const toWhs = (value: unknown): string | null => {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  return text || null;
};

export const createPartnerWarehouseMasters = (deps?: {
  queryTenant?: (dbName: string, query: string, parameters?: unknown[]) => Promise<unknown>;
}): PartnerWarehouseMasters => {
  const queryTenant = deps?.queryTenant ?? executeTenantQuery;

  return {
    getWarehouseForBranch: async (sapDbName, branchId) => {
      const db = sapDbName.trim();
      const bpl = Math.trunc(Number(branchId));
      if (!db || !Number.isFinite(bpl) || bpl <= 0) {
        return null;
      }
      try {
        const rows = (await queryTenant(
          db,
          `SELECT TOP 1 "WhsCode"
             FROM "OWHS"
            WHERE "Inactive" = 'N'
              AND "BPLid" = ?
            ORDER BY "WhsCode" ASC`,
          [bpl],
        )) as Array<Record<string, unknown>>;
        return toWhs(rows[0]?.WhsCode ?? rows[0]?.whsCode);
      } catch {
        return null;
      }
    },

    getItemWarehouseOnBranch: async (sapDbName, itemCode, branchId) => {
      const db = sapDbName.trim();
      const code = itemCode.trim();
      const bpl = Math.trunc(Number(branchId));
      if (!db || !code || !Number.isFinite(bpl) || bpl <= 0) {
        return null;
      }
      try {
        // OITM.DfltWH must exist on OWHS for the document BPL.
        const rows = (await queryTenant(
          db,
          `SELECT TOP 1 T0."DfltWH" AS "WhsCode"
             FROM "OITM" T0
             INNER JOIN "OWHS" T1 ON T1."WhsCode" = T0."DfltWH"
            WHERE T0."ItemCode" = ?
              AND T1."Inactive" = 'N'
              AND T1."BPLid" = ?`,
          [code, bpl],
        )) as Array<Record<string, unknown>>;
        return toWhs(rows[0]?.WhsCode ?? rows[0]?.whsCode ?? rows[0]?.DfltWH);
      } catch {
        return null;
      }
    },
  };
};

export const partnerWarehouseMasters = createPartnerWarehouseMasters();
