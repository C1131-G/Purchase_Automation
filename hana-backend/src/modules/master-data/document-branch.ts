/**
 * Document branch (SAP BPLId) for multi-branch companies (e.g. RCM).
 *
 * Policy:
 * 1. Explicit payload branch (UI / API)
 * 2. Line warehouse → OWHS.BPLid
 * 3. First active OBPL (company default)
 * 4. Omit when null — single-branch tenants (Ajax) usually accept docs without BPL
 *
 * Service Layer field on marketing documents: BPL_IDAssignedToInvoice.
 */

import { logger } from "@/core/logger/pino-logger";
import { getDefaultBranch, getWarehouseBranch } from "@/modules/master-data/master-data.service";

export type ResolveDocumentBranchInput = {
  dbName: string;
  /** Explicit branch from client payload (preferred when create page sends it). */
  payloadBranchId?: unknown;
  /** First document line warehouse (maps via OWHS.BPLid when set). */
  warehouseCode?: string | null;
};

export type ResolveDocumentBranchResult = {
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

/** First warehouse code from SAP document lines (or empty). */
export const firstLineWarehouseCode = (lines: unknown): string | null => {
  if (!Array.isArray(lines) || lines.length === 0) {
    return null;
  }
  for (const line of lines) {
    if (!line || typeof line !== "object") {
      continue;
    }
    const row = line as Record<string, unknown>;
    const code = String(row.WarehouseCode ?? row.warehouseCode ?? "").trim();
    if (code) {
      return code;
    }
  }
  return null;
};

/**
 * Resolve branch for Service Layer marketing documents.
 * Only returns a value when one can be determined — omit on payload when null (Ajax).
 */
export const resolveDocumentBranchId = async (
  input: ResolveDocumentBranchInput,
): Promise<ResolveDocumentBranchResult> => {
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
        msg: "Document branch: warehouse branch lookup failed",
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
        msg: "Document branch: default OBPL lookup failed",
      });
    }
  }

  return { branchId: null, source: "none" };
};

/**
 * Apply branch onto SAP document payload when resolved.
 * Field used by Service Layer for marketing documents: BPL_IDAssignedToInvoice.
 */
export const applyDocumentBranchToSapPayload = (
  sapPayload: Record<string, unknown>,
  branchId: number | null,
): void => {
  if (branchId == null) {
    return;
  }
  sapPayload.BPL_IDAssignedToInvoice = branchId;
};

/** Resolve + apply branch for a create mutation; logs source. */
export const assignDocumentBranch = async (params: {
  dbName: string;
  sapPayload: Record<string, unknown>;
  clientPayload: Record<string, unknown>;
  warehouseCode?: string | null;
  logLabel?: string;
}): Promise<ResolveDocumentBranchResult> => {
  const warehouseCode =
    params.warehouseCode ??
    firstLineWarehouseCode(params.sapPayload.DocumentLines) ??
    firstLineWarehouseCode(params.clientPayload.DocumentLines);

  const result = await resolveDocumentBranchId({
    dbName: params.dbName,
    payloadBranchId:
      params.clientPayload.BPL_IDAssignedToInvoice ??
      params.clientPayload.BPLId ??
      params.clientPayload.branchId ??
      null,
    warehouseCode,
  });
  applyDocumentBranchToSapPayload(params.sapPayload, result.branchId);
  logger.info({
    branchId: result.branchId,
    branchSource: result.source,
    companyDB: params.dbName,
    msg: params.logLabel ?? "Document branch assignment",
    warehouseCode: warehouseCode ?? null,
  });
  return result;
};

/** @deprecated Prefer resolveDocumentBranchId — kept for existing imports. */
export const resolvePoBranchId = resolveDocumentBranchId;
/** @deprecated Prefer applyDocumentBranchToSapPayload. */
export const applyPoBranchToSapPayload = applyDocumentBranchToSapPayload;
