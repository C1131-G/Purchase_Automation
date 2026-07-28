/**
 * Explicit tax codes used across IC document types.
 * One field per document side so ops can see what SAP VatGroup is applied where.
 */

export type IcLineTaxUsage = {
  itemCode: string;
  lineNum: number;
  /** Buyer PQ / RFQ line tax (purchase tax on source company). */
  pqTaxCode: string | null;
  /** Seller SQ line tax (sales tax on target company). */
  sqTaxCode: string | null;
  /** Buyer PO line tax (purchase tax). */
  poTaxCode: string | null;
  /** Seller AR invoice draft line tax (sales tax). */
  arTaxCode: string | null;
};

export const emptyTaxUsage = (params: {
  itemCode?: string | null;
  lineNum?: number;
}): IcLineTaxUsage => ({
  arTaxCode: null,
  itemCode: String(params.itemCode ?? "").trim(),
  lineNum: params.lineNum ?? 0,
  poTaxCode: null,
  pqTaxCode: null,
  sqTaxCode: null,
});

export const normalizeTaxCode = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text || null;
};

/** Flow 1 convert: buyer PQ tax → seller SQ tax. */
export const flow1LineTaxUsage = (params: {
  itemCode?: string | null;
  lineNum?: number;
  pqTaxCode?: unknown;
  sqTaxCode?: unknown;
}): IcLineTaxUsage => ({
  ...emptyTaxUsage(params),
  pqTaxCode: normalizeTaxCode(params.pqTaxCode),
  sqTaxCode: normalizeTaxCode(params.sqTaxCode),
});

/** Flow 2: buyer PO tax → seller AR tax. */
export const flow2LineTaxUsage = (params: {
  itemCode?: string | null;
  lineNum?: number;
  poTaxCode?: unknown;
  arTaxCode?: unknown;
}): IcLineTaxUsage => ({
  ...emptyTaxUsage(params),
  arTaxCode: normalizeTaxCode(params.arTaxCode),
  poTaxCode: normalizeTaxCode(params.poTaxCode),
});
