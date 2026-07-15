/**
 * Dynamic shapes from raw HANA SQL and SAP Service Layer.
 * Call sites use DynRow / helpers instead of writing `any`.
 *
 * The index signature uses `any` only inside this module (disabled below)
 * so property access stays ergonomic without spreading `any` across services.
 */
/* oxlint-disable typescript/no-explicit-any */

export type DynValue = any;

export type DynRow = Record<string, any>;

export interface CountRow {
  total?: number | string;
  TOTAL?: number | string;
}

/** Common document list columns returned by HANA UNION list queries. */
export type DocListRow = DynRow & {
  Address?: string | null;
  Address2?: string | null;
  AttachmentEntry?: number | string | null;
  CardCode?: string | null;
  CardName?: string | null;
  DocCurr?: string | null;
  DocDate?: string | null;
  DocEntry?: number | string;
  DocNum?: number | string;
  DocStatus?: string | null;
  DocTotal?: number | string | null;
  NumAtCard?: string | null;
  PaidToDate?: number | string | null;
  TotalDiscount?: number | string | null;
};

export type SapLine = DynRow & {
  ItemCode?: string | null;
  Quantity?: number | string | null;
  UnitPrice?: number | string | null;
  WarehouseCode?: string | null;
  LineNum?: number | string | null;
};

export type SapDocumentPayload = DynRow & {
  DocumentLines?: SapLine[] | DynRow[];
  attachments?: DynRow[];
  CardCode?: string | null;
  DocDate?: string | null;
  DocDueDate?: string | null;
  Comments?: string | null;
};

export const asDynRow = (value: unknown): DynRow =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as DynRow) : {};

export const asDynRows = (value: unknown): DynRow[] =>
  Array.isArray(value) ? (value as DynRow[]) : [];

export const countTotal = (rows: CountRow[] | DynRow[]): number => {
  const row = rows[0] as CountRow | undefined;
  return +Number(row?.total ?? row?.TOTAL ?? 0);
};

export const dynStr = (value: unknown, fallback = ""): string => {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
};

export const dynNum = (value: unknown, fallback = 0): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const dynNumOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

/* oxlint-enable typescript/no-explicit-any */
