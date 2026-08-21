/**
 * Resolve seller warehouses for multi-branch SAP companies.
 * Used when IC sets BPL_IDAssignedToInvoice — line WH must share that BPL.
 *
 * SQ / RFQ policy:
 * 1. Prefer RFQ warehouse (OSCN.U_Warehouse / U_Warhouse matched on seller OWHS
 *    by WhsCode then WhsName). Branch = OWHS.BPLid.
 * 2. Else DEFAULT_BRANCH_ID (e.g. 1) warehouse
 * 3. Else first active branch+WH with BPLid
 * 4. Else any active WH (BPL optional — single-branch / Ajax-style tenants)
 * 5. Else first active OBPL → WH on that place
 * Never copy buyer PQ warehouse onto RFQ. Never invent WH from OITM.DfltWH.
 * UoM is independent of warehouse: SQ copies RFQ UoM (seller sales stored on RFQ).
 */

import { logger } from "@/core/logger/pino-logger";
import { executeTenantQuery } from "@/db/tenant-query";

export type BranchWarehouse = {
  branchId: number | null;
  warehouseCode: string;
};

export type PartnerWarehouseMasters = {
  /**
   * First active warehouse on the given business place (OWHS.BPLid).
   * Used as document-level default for auto SQ lines.
   */
  getWarehouseForBranch: (sapDbName: string, branchId: number) => Promise<string | null>;
  /**
   * If WhsCode exists and is active on seller books, return its BPLid (and code).
   * Used when RFQ already stores a seller warehouse code.
   */
  resolveWarehouseIfExists: (
    sapDbName: string,
    warehouseCode: string,
  ) => Promise<BranchWarehouse | null>;
  /**
   * Match OSCN.U_Warehouse / U_Warhouse (code or description) onto seller OWHS.
   * Prefers WhsCode, then WhsName (case-insensitive). Skips inactive rows.
   */
  resolveWarehouseByCodeOrName: (
    sapDbName: string,
    warehouseHint: string,
  ) => Promise<BranchWarehouse | null>;
  /**
   * First active warehouse with a valid BPL anywhere in the company.
   * Fallback when default branch has no active WH.
   */
  getFirstActiveBranchWarehouse: (sapDbName: string) => Promise<BranchWarehouse | null>;
  /**
   * First active warehouse (BPLid optional). For single-branch DBs where OWHS.BPLid is null.
   */
  getFirstActiveWarehouse: (sapDbName: string) => Promise<BranchWarehouse | null>;
  /**
   * First enabled business place (OBPL) when IC_COMPANY.DEFAULT_BRANCH_ID is unset.
   */
  getDefaultObplBranch: (sapDbName: string) => Promise<number | null>;
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

const logOwHsFailure = (params: {
  sapDbName: string;
  operation: string;
  err: unknown;
  extra?: Record<string, unknown>;
}): void => {
  logger.warn({
    err: params.err,
    msg: "IC partner warehouse lookup failed",
    operation: params.operation,
    sapDbName: params.sapDbName,
    ...params.extra,
  });
};

export const createPartnerWarehouseMasters = (deps?: {
  queryTenant?: (dbName: string, query: string, parameters?: unknown[]) => Promise<unknown>;
}): PartnerWarehouseMasters => {
  const queryTenant = deps?.queryTenant ?? executeTenantQuery;

  return {
    getDefaultObplBranch: async (sapDbName) => {
      const db = sapDbName.trim();
      if (!db) {
        return null;
      }
      try {
        const rows = (await queryTenant(
          db,
          `SELECT TOP 1 "BPLId"
             FROM "OBPL"
            WHERE COALESCE("Disabled", 'N') = 'N'
            ORDER BY "BPLId" ASC`,
        )) as Array<Record<string, unknown>>;
        return toBranchId(rows[0]?.BPLId ?? rows[0]?.bplId ?? rows[0]?.BPLid);
      } catch (err) {
        logOwHsFailure({ err, operation: "getDefaultObplBranch", sapDbName: db });
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
            WHERE COALESCE("Inactive", 'N') = 'N'
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
      } catch (err) {
        logOwHsFailure({ err, operation: "getFirstActiveBranchWarehouse", sapDbName: db });
        return null;
      }
    },

    getFirstActiveWarehouse: async (sapDbName) => {
      const db = sapDbName.trim();
      if (!db) {
        return null;
      }
      try {
        // Prefer WH that already has a BPL, then any active WH (Ajax often has null BPLid).
        const rows = (await queryTenant(
          db,
          `SELECT TOP 1 "WhsCode", "BPLid"
             FROM "OWHS"
            WHERE COALESCE("Inactive", 'N') = 'N'
            ORDER BY
              CASE WHEN "BPLid" IS NOT NULL AND "BPLid" > 0 THEN 0 ELSE 1 END,
              "BPLid" ASC,
              "WhsCode" ASC`,
        )) as Array<Record<string, unknown>>;
        const warehouseCode = toWhs(rows[0]?.WhsCode ?? rows[0]?.whsCode);
        if (!warehouseCode) {
          return null;
        }
        return {
          branchId: toBranchId(rows[0]?.BPLid ?? rows[0]?.bplId ?? rows[0]?.BPLId),
          warehouseCode,
        };
      } catch (err) {
        logOwHsFailure({ err, operation: "getFirstActiveWarehouse", sapDbName: db });
        return null;
      }
    },

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
            WHERE COALESCE("Inactive", 'N') = 'N'
              AND "BPLid" = ?
            ORDER BY "WhsCode" ASC`,
          [bpl],
        )) as Array<Record<string, unknown>>;
        return toWhs(rows[0]?.WhsCode ?? rows[0]?.whsCode);
      } catch (err) {
        logOwHsFailure({
          err,
          extra: { branchId: bpl },
          operation: "getWarehouseForBranch",
          sapDbName: db,
        });
        return null;
      }
    },

    resolveWarehouseIfExists: async (sapDbName, warehouseCode) => {
      const db = sapDbName.trim();
      const whs = String(warehouseCode ?? "").trim();
      if (!db || !whs) {
        return null;
      }
      try {
        const rows = (await queryTenant(
          db,
          `SELECT TOP 1 "WhsCode", "BPLid"
             FROM "OWHS"
            WHERE COALESCE("Inactive", 'N') = 'N'
              AND "WhsCode" = ?`,
          [whs],
        )) as Array<Record<string, unknown>>;
        const code = toWhs(rows[0]?.WhsCode ?? rows[0]?.whsCode);
        if (!code) {
          return null;
        }
        // WH may exist without BPLid (single-branch). Still usable for line WarehouseCode.
        return {
          branchId: toBranchId(rows[0]?.BPLid ?? rows[0]?.bplId ?? rows[0]?.BPLId),
          warehouseCode: code,
        };
      } catch (err) {
        logOwHsFailure({
          err,
          extra: { warehouseCode: whs },
          operation: "resolveWarehouseIfExists",
          sapDbName: db,
        });
        return null;
      }
    },

    resolveWarehouseByCodeOrName: async (sapDbName, warehouseHint) => {
      const db = sapDbName.trim();
      const hint = String(warehouseHint ?? "").trim();
      if (!db || !hint) {
        return null;
      }
      try {
        const rows = (await queryTenant(
          db,
          `SELECT TOP 1 "WhsCode", "BPLid"
             FROM "OWHS"
            WHERE COALESCE("Inactive", 'N') = 'N'
              AND (
                UPPER("WhsCode") = UPPER(?)
                OR UPPER("WhsName") = UPPER(?)
              )
            ORDER BY
              CASE WHEN UPPER("WhsCode") = UPPER(?) THEN 0 ELSE 1 END,
              "WhsCode" ASC`,
          [hint, hint, hint],
        )) as Array<Record<string, unknown>>;
        const code = toWhs(rows[0]?.WhsCode ?? rows[0]?.whsCode);
        if (!code) {
          return null;
        }
        return {
          branchId: toBranchId(rows[0]?.BPLid ?? rows[0]?.bplId ?? rows[0]?.BPLId),
          warehouseCode: code,
        };
      } catch (err) {
        logOwHsFailure({
          err,
          extra: { warehouseHint: hint },
          operation: "resolveWarehouseByCodeOrName",
          sapDbName: db,
        });
        return null;
      }
    },
  };
};

export const partnerWarehouseMasters = createPartnerWarehouseMasters();
