/** SAP Document Line Utilities: Normalize and transform SAP line data for frontend hydration. */

/**
 * Normalize SAP line data to produce a canonical pre-discount unit price.
 *
 * SAP stores `Price`/`UnitPrice` as the discounted unit price on document lines.
 * For edit hydration, we need to reconstruct the original pre-discount price
 * so the frontend can recompute discount, tax, and totals consistently.
 *
 * Formula:
 *   LineTotal = (UnitPrice × Quantity) - DiscountAmount
 *   DiscountAmount = (UnitPrice × Quantity) × (DiscountPercent / 100)
 *   LineTotal = (UnitPrice × Quantity) × (1 - DiscountPercent / 100)
 *   UnitPrice = LineTotal / (Quantity × (1 - DiscountPercent / 100))
 *
 * @param line - SAP document line object
 * @returns Normalized line data with canonical pre-discount unit price
 */
export const normalizeSAPLineData = (line: Record<string, unknown>) => {
  const quantity = Number(line.Quantity ?? line.quantity ?? 0) || 0;
  const discountPercent = Number(line.DiscountPercent ?? line.discountPercent ?? 0) || 0;
  const lineTotal = Number(line.LineTotal ?? line.lineTotal ?? 0) || 0;

  // Derive canonical pre-discount unit price from SAP line data
  let unitPrice = Number(line.Price ?? line.UnitPrice ?? line.price ?? line.unitPrice ?? 0) || 0;

  // If we have LineTotal and Quantity, back-calculate the pre-discount unit price
  if (lineTotal > 0 && quantity > 0) {
    const discountMultiplier = 1 - discountPercent / 100;
    if (discountMultiplier > 0) {
      // Reconstruct original pre-discount unit price
      unitPrice = lineTotal / (quantity * discountMultiplier);
    }
  }

  return {
    ItemCode: String(line.ItemCode ?? line.itemCode ?? ""),
    ItemDescription: String(line.ItemDescription ?? line.itemDescription ?? ""),
    Quantity: quantity,
    Price: unitPrice,
    DiscountPercent: discountPercent,
    LineTotal: lineTotal,
    TaxCode: String(line.TaxCode ?? line.taxCode ?? ""),
    VatGroup: String(line.VatGroup ?? line.vatGroup ?? line.TaxCode ?? line.taxCode ?? ""),
    // Preserve VatPrcnt even when 0 — 0 is a meaningful tax rate, not "missing"
    // Prefer TaxPercentagePerRow (actual rate SAP applied) over raw VatPrcnt
    VatPrcnt: Number(
      line.TaxPercentagePerRow ?? line.taxPercentagePerRow ?? line.VatPrcnt ?? line.vatPrcnt ?? 0,
    ),
    UoMCode: line.UoMCode ?? line.uomCode,
    UoMEntry:
      (line.UoMEntry ?? line.uomEntry !== undefined)
        ? Number(line.UoMEntry ?? line.uomEntry)
        : undefined,
    WarehouseCode: String(line.WarehouseCode ?? line.warehouseCode ?? ""),
    LineNum: Number(line.LineNum ?? line.lineNum ?? 0) || 0,
    RemainingOpenQuantity: Number(
      line.RemainingOpenQuantity ??
        line.remainingOpenQuantity ??
        line.OpenQuantity ??
        line.openQuantity ??
        line.OpenQty ??
        line.openQty ??
        quantity,
    ),
  };
};
