/**
 * Document branch (SAP BPLId) helpers for multi-branch create pages (e.g. RCM).
 * Warehouse OWHS.BPLid drives default branch; UI may override via branch lookup.
 */

export type WarehouseWithBranch = {
  code: string;
  name?: string;
  branchId?: number | null;
};

export type BranchLookupItem = {
  code: string;
  name: string;
  branchId?: number | null;
};

export const toPositiveBranchId = (value: unknown): number | null => {
  if (value == null || value === "") {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }
  return Math.trunc(num);
};

export const formatBranchDisplay = (name: string, branchId: number | string): string => {
  const id = String(branchId).trim();
  const label = String(name ?? "").trim();
  if (!label) {
    return id ? `Branch ${id}` : "";
  }
  if (!id || label === id || label.includes(`(${id})`)) {
    return label;
  }
  return `${label} (${id})`;
};

/** Branch from warehouse master row (OWHS.BPLid). */
export const branchIdFromWarehouse = (
  warehouses: WarehouseWithBranch[],
  warehouseCode: string | null | undefined,
): number | null => {
  const code = String(warehouseCode ?? "").trim();
  if (!code) {
    return null;
  }
  const matched = warehouses.find((w) => String(w.code).trim() === code);
  return toPositiveBranchId(matched?.branchId);
};

/**
 * Always show branch on create pages so single-branch companies (e.g. Ajax)
 * get the same UI as multi-branch (RCM). Field stays empty when unset;
 * warehouse BPLid can still auto-fill when available.
 */
export const shouldShowDocumentBranch = (
  _branches?: BranchLookupItem[],
  _warehouses?: WarehouseWithBranch[],
): boolean => true;

/** Fields to merge into SAP create payload. */
export const documentBranchPayload = (
  branchId: number | null | undefined,
): { BPL_IDAssignedToInvoice?: number; branchId?: number } => {
  const id = toPositiveBranchId(branchId);
  if (id == null) {
    return {};
  }
  return {
    BPL_IDAssignedToInvoice: id,
    branchId: id,
  };
};
