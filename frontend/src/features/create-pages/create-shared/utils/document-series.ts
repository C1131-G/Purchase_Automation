/**
 * Document numbering series (SAP NNM1) helpers for create/edit headers.
 * Auto-suggest follows the POS rule: warehouse store location = NNM1.Remark.
 * Object codes: PQ=540000006, PO=22, SQ=23.
 */

export const SAP_SERIES_OBJECT = {
  purchaseOrder: "22",
  purchaseQuotation: "540000006",
  salesQuotation: "23",
} as const;

export type SeriesLookupItem = {
  code: string;
  name: string;
  branchId?: number | null | undefined;
  nextNumber?: number | null | undefined;
  /** NNM1.Remark — the POS store location this series belongs to. */
  location?: string | null | undefined;
};

export const toPositiveSeries = (value: unknown): number | null => {
  if (value == null || value === "") {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }
  return Math.trunc(num);
};

export const formatSeriesDisplay = (
  name: string,
  nextNumber: number | null | undefined,
  seriesId: number | string,
): string => {
  const id = String(seriesId).trim();
  const label = String(name ?? "").trim() || (id ? `Series ${id}` : "");
  const next = toPositiveSeries(nextNumber);
  if (next != null && !label.includes(String(next))) {
    return `${label} · ${next}`;
  }
  return label;
};

/**
 * Auto-commit only canonical series codes or complete formatted displays.
 * Exact names and next numbers remain suggestions because either may be ambiguous.
 */
export const findSeriesSelection = <T extends SeriesLookupItem>(
  items: readonly T[],
  value: string,
): T | undefined => {
  const term = value.trim().toLowerCase();
  if (!term) {
    return undefined;
  }

  return items.find((item) => {
    const id = toPositiveSeries(item.code);
    return (
      String(item.code).trim().toLowerCase() === term ||
      (id != null && formatSeriesDisplay(item.name, item.nextNumber, id).toLowerCase() === term)
    );
  });
};

const normalizeLocation = (value: string | null | undefined): string =>
  String(value ?? "")
    .trim()
    .toLowerCase();

/**
 * Same rule as the POS: the series whose Remarks equals the warehouse's store location.
 * No match → no suggestion (SAP default series applies).
 */
export const suggestSeries = (
  items: SeriesLookupItem[],
  location?: string | null,
): SeriesLookupItem | null => {
  const target = normalizeLocation(location);
  if (!target) {
    return null;
  }
  return items.find((item) => normalizeLocation(item.location) === target) ?? null;
};

/** POS store location of the selected warehouse (warehouse lookup `location`). */
export const storeLocationForWarehouse = (
  warehouses: ReadonlyArray<{ code: string; location?: string | null | undefined }>,
  warehouseCode: string | null | undefined,
): string | null => {
  const code = String(warehouseCode ?? "").trim();
  if (!code) {
    return null;
  }
  return warehouses.find((w) => String(w.code).trim() === code)?.location ?? null;
};

/** Fields to merge into SAP create payload. */
export const documentSeriesPayload = (series: number | null | undefined): { Series?: number } => {
  const id = toPositiveSeries(series);
  if (id == null) {
    return {};
  }
  return { Series: id };
};
