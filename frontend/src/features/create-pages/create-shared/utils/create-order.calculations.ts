/** Create Order Calculations: Business logic for computing totals, taxes, and line items. */
import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";

/** Calculate totals for a single product line with tax-exclusive unit price. */
export const calculateLineTotals = (row: ProductRow) => {
  const gross = row.price * row.quantity;
  const discount = Math.max(0, Math.min(gross, row.discountAmount));
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
  let taxTotal = 0;
  let netTotal = 0;
  let grandTotal = 0;

  for (const row of productRows) {
    const { lineNet, lineTax, lineTotal } = calculateLineTotals(row);
    taxTotal += lineTax;
    netTotal += lineNet;
    grandTotal += lineTotal;
  }

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
