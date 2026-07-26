/**
 * TEMP — PO branch assignment for multi-branch SAP companies (e.g. RCM).
 *
 * Why: SAP returns "Specify an active branch [OPOR.BPLId]" when multi-branch
 * is enabled and BPL is omitted. Ajax often has no mandatory branch → null is fine.
 *
 * Decision later:
 * - keep auto-default only, or
 * - drive from create-page branch field, or
 * - use IC_COMPANY.DEFAULT_BRANCH_ID only.
 *
 * Remove / replace this module when product approach is chosen.
 */

import { logger } from "@/core/logger/pino-logger";
import { getDefaultBranch, getWarehouseBranch } from "@/modules/master-data/master-data.service";

export type ResolvePoBranchInput = {
  dbName: string;
  /** Explicit branch from client payload (preferred when create page sends it). */
  payloadBranchId?: unknown;
  /** First document line warehouse (maps via OWHS.BPLid when set). */
  warehouseCode?: string | null;
};

export type ResolvePoBranchResult = {
  branchId: number | null;
  source: "payload" | "warehouse" | "default_obpl" | "none";
};

const toPositiveBranchId = (value: unknown): number | null => {
  if (value == null || value === "") {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }
  return Math.trunc(num);
};

/**
 * Resolve branch for Service Layer PO / PO draft.
 * Only returns a value when one can be determined — omit on payload when null (Ajax).
 */
export const resolvePoBranchId = async (
  input: ResolvePoBranchInput,
): Promise<ResolvePoBranchResult> => {
  const fromPayload = toPositiveBranchId(input.payloadBranchId);
  if (fromPayload != null) {
    return { branchId: fromPayload, source: "payload" };
  }

  const warehouseCode = String(input.warehouseCode ?? "").trim();
  if (warehouseCode && input.dbName) {
    try {
      const fromWh = toPositiveBranchId(await getWarehouseBranch(input.dbName, warehouseCode));
      if (fromWh != null) {
        return { branchId: fromWh, source: "warehouse" };
      }
    } catch (err) {
      logger.warn({
        dbName: input.dbName,
        err,
        msg: "TEMP PO branch: warehouse branch lookup failed",
        warehouseCode,
      });
    }
  }

  if (input.dbName) {
    try {
      const fromDefault = toPositiveBranchId(await getDefaultBranch(input.dbName));
      if (fromDefault != null) {
        return { branchId: fromDefault, source: "default_obpl" };
      }
    } catch (err) {
      logger.warn({
        dbName: input.dbName,
        err,
        msg: "TEMP PO branch: default OBPL lookup failed",
      });
    }
  }

  return { branchId: null, source: "none" };
};

/**
 * Apply branch onto SAP PO payload when resolved.
 * Field used by Service Layer for marketing documents: BPL_IDAssignedToInvoice.
 */
export const applyPoBranchToSapPayload = (
  sapPayload: Record<string, unknown>,
  branchId: number | null,
): void => {
  if (branchId == null) {
    return;
  }
  sapPayload.BPL_IDAssignedToInvoice = branchId;
};
