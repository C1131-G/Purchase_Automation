/**
 * Document numbering series (SAP NNM1) helpers for create/edit headers.
 * Auto-suggest: warehouse SAP location = NNM1.Remark AND document branch = NNM1.BPLId.
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
  /** NNM1.Remark — the warehouse location this series belongs to. */
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
  const seriesLabel = id && !label.includes(`Series ${id}`) ? `${label} · Series ${id}` : label;
  if (next != null && !seriesLabel.includes(String(next))) {
    return `${seriesLabel} · Next ${next}`;
  }
  return seriesLabel;
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
 * Select the best series for the current warehouse location and branch.
 * Prefer an exact location and branch match. A location-only series is a safe
 * fallback for that same warehouse. When no branch exists, use the warehouse
 * location alone; never fall back to a different location or branch.
 */
export const suggestSeries = (
  items: SeriesLookupItem[],
  location?: string | null,
  branchId?: number | null,
  warehouseCode?: string | null,
  warehouseName?: string | null,
): SeriesLookupItem | null => {
  const targets = [location, warehouseCode, warehouseName].map(normalizeLocation).filter(Boolean);
  const branch = toPositiveSeries(branchId);
  if (targets.length === 0 && branch == null) {
    return null;
  }

  if (targets.length > 0 && branch != null) {
    const exactMatch = targets
      .map((target) =>
        items.find(
          (item) =>
            normalizeLocation(item.location) === target &&
            toPositiveSeries(item.branchId) === branch,
        ),
      )
      .find(Boolean);
    if (exactMatch) {
      return exactMatch;
    }

    const locationOnlyMatch = targets
      .map((target) =>
        items.find(
          (item) =>
            normalizeLocation(item.location) === target && toPositiveSeries(item.branchId) == null,
        ),
      )
      .find(Boolean);
    if (locationOnlyMatch) {
      return locationOnlyMatch;
    }

    return null;
  }

  if (targets.length > 0) {
    return (
      targets
        .map((target) => items.find((item) => normalizeLocation(item.location) === target))
        .find(Boolean) ?? null
    );
  }

  return (
    items.find(
      (item) => toPositiveSeries(item.branchId) === branch && !normalizeLocation(item.location),
    ) ??
    items.find((item) => toPositiveSeries(item.branchId) === branch) ??
    null
  );
};

/** SAP location of the selected warehouse (warehouse lookup `location`). */
export const locationForWarehouse = (
  warehouses: ReadonlyArray<{ code: string; location?: string | null | undefined }>,
  warehouseCode: string | null | undefined,
): string | null => {
  const code = String(warehouseCode ?? "").trim();
  if (!code) {
    return null;
  }
  return warehouses.find((w) => String(w.code).trim() === code)?.location ?? null;
};

/** Name of the selected warehouse, used when a series is tagged by warehouse identity. */
export const nameForWarehouse = (
  warehouses: ReadonlyArray<{ code: string; name?: string | null | undefined }>,
  warehouseCode: string | null | undefined,
): string | null => {
  const code = String(warehouseCode ?? "").trim();
  if (!code) {
    return null;
  }
  return warehouses.find((warehouse) => String(warehouse.code).trim() === code)?.name ?? null;
};

/** Fields to merge into SAP create payload. */
export const documentSeriesPayload = (series: number | null | undefined): { Series?: number } => {
  const id = toPositiveSeries(series);
  if (id == null) {
    return {};
  }
  return { Series: id };
};
