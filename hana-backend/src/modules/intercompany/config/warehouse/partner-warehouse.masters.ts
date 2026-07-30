/**
 * Resolve seller warehouses for multi-branch SAP companies.
 * Used when IC sets BPL_IDAssignedToInvoice — line WH must share that BPL.
 *
 * Policy: prefer DEFAULT_BRANCH_ID warehouse; if none, use any active branch+WH.
 * Do not switch warehouse/branch from item default WH (OITM.DfltWH).
 */

import { executeTenantQuery } from "@/db/tenant-query";

export type BranchWarehouse = {
  branchId: number;
  warehouseCode: string;
};

export type PartnerWarehouseMasters = {
  /**
   * First active warehouse on the given business place (OWHS.BPLid).
   * Used as document-level default for auto SQ lines.
   */
  getWarehouseForBranch: (sapDbName: string, branchId: number) => Promise<string | null>;
  /**
   * First active warehouse with a valid BPL anywhere in the company.
   * Fallback when default branch has no active WH.
   */
  getFirstActiveBranchWarehouse: (sapDbName: string) => Promise<BranchWarehouse | null>;
};

const toWhs = (value: unknown): string | null => {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  return text || null;
};

const toBranchId = (value: unknown): number | null => {
  const branchId = Math.trunc(Number(value));
  return Number.isFinite(branchId) && branchId > 0 ? branchId : null;
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

    getFirstActiveBranchWarehouse: async (sapDbName) => {
      const db = sapDbName.trim();
      if (!db) {
        return null;
      }
      try {
        const rows = (await queryTenant(
          db,
          `SELECT TOP 1 "WhsCode", "BPLid"
             FROM "OWHS"
            WHERE "Inactive" = 'N'
              AND "BPLid" IS NOT NULL
              AND "BPLid" > 0
            ORDER BY "BPLid" ASC, "WhsCode" ASC`,
        )) as Array<Record<string, unknown>>;
        const warehouseCode = toWhs(rows[0]?.WhsCode ?? rows[0]?.whsCode);
        const branchId = toBranchId(rows[0]?.BPLid ?? rows[0]?.bplId ?? rows[0]?.BPLId);
        if (!warehouseCode || branchId == null) {
          return null;
        }
        return { branchId, warehouseCode };
      } catch {
        return null;
      }
    },
  };
};

export const partnerWarehouseMasters = createPartnerWarehouseMasters();
