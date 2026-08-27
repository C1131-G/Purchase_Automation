/**
 * Document numbering series (SAP NNM1) helpers for create/edit headers.
 * Object codes: PQ=540000006, PO=22, GRPO=20, AP Invoice=18, APCM=19, SQ=23, OP=46.
 */

export const SAP_SERIES_OBJECT = {
  apCreditMemo: "19",
  apInvoice: "18",
  goodsReceiptPO: "20",
  outgoingPayment: "46",
  purchaseOrder: "22",
  purchaseQuotation: "540000006",
  salesQuotation: "23",
} as const;

export type SeriesLookupItem = {
  code: string;
  name: string;
  branchId?: number | null | undefined;
  nextNumber?: number | null | undefined;
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

export const suggestSeries = (
  items: SeriesLookupItem[],
  branchId?: number | null,
): SeriesLookupItem | null => {
  if (items.length === 0) {
    return null;
  }
  const branch = toPositiveSeries(branchId);
  if (branch != null) {
    const matched = items.find((item) => toPositiveSeries(item.branchId) === branch);
    if (matched) {
      return matched;
    }
  }
  return items[0] ?? null;
};

/** Fields to merge into SAP create payload. */
export const documentSeriesPayload = (series: number | null | undefined): { Series?: number } => {
  const id = toPositiveSeries(series);
  if (id == null) {
    return {};
  }
  return { Series: id };
};
