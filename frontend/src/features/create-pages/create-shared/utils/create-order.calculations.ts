/** Create Order Calculations: Business logic for computing totals, taxes, and line items. */
import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";

const round2 = (num: number) => Math.round(num * 100 + (num >= 0 ? 1e-9 : -1e-9)) / 100;

/**
 * SAP B1 truncates discount amounts (floors for positive values) rather than rounding.
 * e.g. 2.35 × 10% = 0.235 → SAP stores 0.23, not 0.24.
 * We must match this to prevent pre-post total discrepancies.
 */
const sapTruncDiscount = (gross: number, discountPercent: number): number =>
  Math.trunc((gross * discountPercent) / 100 * 100) / 100;

/** Calculate totals for a single product line with tax-exclusive unit price. */
export const calculateLineTotals = (row: ProductRow) => {
  const gross = row.price * row.quantity;
  // Always recompute discount from percent using SAP-compatible truncation.
  // SAP B1 truncates (floors) the discount amount, not rounds it.
  // Trusting row.discountAmount (computed with Math.round) causes a 0.01 mismatch
  // where the pre-post displayed total differs from what SAP actually posts.
  const discount =
    row.discountPercent > 0
      ? sapTruncDiscount(gross, row.discountPercent)
      : row.discountAmount;
  // Net line subtotal (pre-tax). SAP rounds this to currency precision (typically 2) per line.
  const rawLineNet = gross - discount;
  const lineNet = round2(rawLineNet);

  const taxRate = Math.max(0, row.taxRate ?? 0);
  // Tax derived from net subtotal. SAP rounds tax per line.
  const rawLineTax = taxRate > 0 ? lineNet * (taxRate / 100) : 0;
  const lineTax = round2(rawLineTax);

  // Inclusive line total (what SAP uses)
  const lineTotal = round2(lineNet + lineTax);

  return {
    discount,
    gross,
    lineNet,
    lineTax,
    lineTotal,
  };
};

export interface CalculateOrderTotalsOptions {
  headerDiscountPercent?: number;
}

export const calculateOrderTotals = (
  productRows: ProductRow[],
  _options?: CalculateOrderTotalsOptions,
) => {
  // 1. Calculate overall weighted average header discount percentage using integer cents arithmetic
  let totalGrossCents = 0;
  let totalDiscountCents = 0;

  for (const row of productRows) {
    const priceCents = Math.round((row.price ?? 0) * 100);
    const qty = Math.max(0, row.quantity ?? 0);
    const lineGrossCents = priceCents * qty;
    totalGrossCents += lineGrossCents;

    const discPct = row.discountPercent ?? 0;
    const lineDiscountCents = Math.round(
      (lineGrossCents * discPct) / 100 + (lineGrossCents * discPct >= 0 ? 1e-9 : -1e-9),
    );
    totalDiscountCents += lineDiscountCents;
  }

  // Inferred header discount logic removed as we no longer apply it to netTotal to avoid double-discounting

  // 2. Sum per-line net totals and compute a weighted-average tax rate across all rows.
  //    Using weighted-avg tax rate on the final netTotal mirrors SAP's approach:
  //    SAP calculates Tax = round(netAfterDiscount × taxRate), avoiding double-discounting
  //    that occurs when per-line taxes are scaled by the header discount factor separately.
  let rawNetTotal = 0;
  let weightedTaxRateNumerator = 0; // sum(lineNet × taxRate)
  let weightedTaxRateDenominator = 0; // sum(lineNet)

  for (const row of productRows) {
    const { lineNet } = calculateLineTotals(row);
    const taxRate = Math.max(0, row.taxRate ?? 0);
    rawNetTotal += lineNet;
    weightedTaxRateNumerator += lineNet * taxRate;
    weightedTaxRateDenominator += lineNet;
  }

  // 3. The rawNetTotal already includes individual line discounts.
  // We do NOT apply the header discount factor again here to prevent double-discounting.
  const netTotal = round2(rawNetTotal);

  // 4. Derive tax from the final netTotal using the weighted-average tax rate.
  //    This matches SAP: tax is computed once on the post-discount net, not double-discounted.
  const avgTaxRate =
    weightedTaxRateDenominator > 0 ? weightedTaxRateNumerator / weightedTaxRateDenominator : 0;
  const taxTotal = round2(netTotal * (avgTaxRate / 100));

  const grandTotal = round2(netTotal + taxTotal);

  return {
    grandTotal,
    netTotal,
    taxTotal,
  };
};

export const calculateSummaryCurrency = (productRows: ProductRow[]) => {
  const currencies = [
    ...new Set(
      productRows.map((row) => row.currency.trim()).filter((currency) => currency.length > 0),
    ),
  ];
  if (currencies.length === 1) {
    return currencies[0] ?? "";
  }
  if (currencies.length > 1) {
    return "MULTI";
  }
  return "";
};
