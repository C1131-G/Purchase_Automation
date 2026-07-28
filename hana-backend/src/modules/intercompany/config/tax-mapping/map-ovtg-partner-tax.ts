import type { PartnerTaxDocSide } from "./partner-tax.masters";

/** SAP OVTG.Category — purchase (input) vs sales (output). */
export const OVTG_CATEGORY_PURCHASE = "I";
export const OVTG_CATEGORY_SALES = "O";

export type OvtgTaxRecord = {
  code: string;
  rate: number;
  category: string;
};

export const normalizeOvtgCategory = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toUpperCase();

export const targetOvtgCategory = (docSide: PartnerTaxDocSide): string =>
  docSide === "purchase" ? OVTG_CATEGORY_PURCHASE : OVTG_CATEGORY_SALES;

const ratesMatch = (left: number, right: number): boolean =>
  Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 0.000_001;

/**
 * Cross-company tax: read source OVTG rate, pick target OVTG with same rate and
 * target document category (purchase I / sales O).
 *
 * PQ→SQ and PO→AR: buyer purchase tax (I) → seller sales tax (O) at matching rate.
 */
export const mapTaxCodeByOvtgRate = (params: {
  sourceTax: OvtgTaxRecord | null;
  targetDocSide: PartnerTaxDocSide;
  targetTaxes: OvtgTaxRecord[];
}): string | null => {
  const sourceTax = params.sourceTax;
  if (!sourceTax || !Number.isFinite(sourceTax.rate)) {
    return null;
  }

  const wantedCategory = targetOvtgCategory(params.targetDocSide);
  const match = params.targetTaxes.find(
    (row) =>
      normalizeOvtgCategory(row.category) === wantedCategory &&
      ratesMatch(row.rate, sourceTax.rate) &&
      row.code.trim(),
  );

  return match?.code.trim() || null;
};
