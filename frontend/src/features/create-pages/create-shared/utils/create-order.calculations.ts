/** Create Order Calculations: Business logic for computing totals, taxes, and line items. */
import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";

/** Calculate totals for a single product line with tax-exclusive unit price. */
export const calculateLineTotals = (row: ProductRow) => {
  const gross = row.price * row.quantity;
  const discount = row.discountAmount;
  // Net line subtotal (pre-tax). SAP rounds this to currency precision (typically 2) per line.
  const rawLineNet = gross - discount;
  const lineNet = Math.round(rawLineNet * 100) / 100;

  const taxRate = Math.max(0, row.taxRate ?? 0);
  // Tax derived from net subtotal. SAP rounds tax per line.
  const rawLineTax = taxRate > 0 ? lineNet * (taxRate / 100) : 0;
  const lineTax = Math.round(rawLineTax * 100) / 100;

  // Inclusive line total (what SAP uses)
  const lineTotal = Math.round((lineNet + lineTax) * 100) / 100;

  return {
    discount,
    gross,
    lineNet,
    lineTax,
    lineTotal,
  };
};

export const calculateOrderTotals = (productRows: ProductRow[]) => {
  // 1. Calculate overall weighted average header discount percentage using integer cents arithmetic
  let totalGrossCents = 0;
  let totalDiscountCents = 0;

  for (const row of productRows) {
    const priceCents = Math.round((row.price ?? 0) * 100);
    const qty = Math.max(0, row.quantity ?? 0);
    const lineGrossCents = priceCents * qty;
    totalGrossCents += lineGrossCents;

    const discPct = row.discountPercent ?? 0;
    const lineDiscountCents = Math.round((lineGrossCents * discPct) / 100);
    totalDiscountCents += lineDiscountCents;
  }

  const headerDiscountPercent = totalGrossCents > 0 ? (totalDiscountCents / totalGrossCents) * 100 : 0;
  const roundedHeaderDiscountPercent = Math.round(headerDiscountPercent * 100) / 100;

  // 2. Sum the pre-header-discount line net and tax totals
  let rawNetTotal = 0;
  let rawTaxTotal = 0;

  for (const row of productRows) {
    const { lineNet, lineTax } = calculateLineTotals(row);
    rawNetTotal += lineNet;
    rawTaxTotal += lineTax;
  }

  // 3. Apply the rounded header discount percent to the totals
  const netTotal = Math.round(rawNetTotal * (1 - roundedHeaderDiscountPercent / 100) * 100) / 100;
  const taxTotal = Math.round(rawTaxTotal * (1 - roundedHeaderDiscountPercent / 100) * 100) / 100;
  const grandTotal = Math.round((netTotal + taxTotal) * 100) / 100;

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
