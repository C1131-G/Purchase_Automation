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

  // Start with the given price (HANA gives post-discount usually, SL gives post-discount usually)
  let unitPrice = Number(line.Price ?? line.UnitPrice ?? line.price ?? line.unitPrice ?? 0) || 0;
  
  if (discountPercent > 0 && discountPercent < 100) {
    // 2. If Service Layer gave us PriceBefDi (Price Before Discount), USE IT!
    if (line.PriceBefDi !== undefined || line.priceBefDi !== undefined) {
      unitPrice = Number(line.PriceBefDi ?? line.priceBefDi);
    } 
    // 3. Otherwise, back-calculate carefully
    else if (unitPrice > 0) {
      const discountMultiplier = 1 - discountPercent / 100;
      // Service Layer's UnitPrice is the discounted price.
      const reconstructedPrice = unitPrice / discountMultiplier;
      
      // Round to 4 decimal places to clean up floating point artifacts (e.g. 4.133333333333334 -> 4.1333)
      // but if it's very close to a 2 decimal number (like 4.13), it will be clean.
      // Wait, if UnitPrice was 3.72, 3.72 / 0.9 = 4.133333. If we round to 4 places, we get 4.1333.
      // If we round to 2 places, we get 4.13. Standard price precision is usually 2 or 6.
      // We will round to 6 decimal places to be safe against precision limits.
      unitPrice = Math.round(reconstructedPrice * 1000000) / 1000000;
      
      // Let's also snap it to 2 decimal places if it's extremely close to a 2 decimal number
      const twoDecimals = Math.round(unitPrice * 100) / 100;
      if (Math.abs(unitPrice - twoDecimals) < 0.005) {
        unitPrice = twoDecimals;
      }
    }
  }

  return {
    ItemCode: String(line.ItemCode ?? line.itemCode ?? ""),
    ItemDescription: String(line.ItemDescription ?? line.itemDescription ?? ""),
    Quantity: quantity,
    OpenQty: Number(
      line.OpenQty ?? line.OpenQuantity ?? line.openQty ?? line.openQuantity ?? quantity,
    ),
    OpenQuantity: Number(
      line.OpenQuantity ?? line.OpenQty ?? line.openQuantity ?? line.openQty ?? quantity,
    ),
    Price: unitPrice,
    DiscountPercent: discountPercent,
    LineTotal: lineTotal,
    TaxCode: String(line.TaxCode ?? line.taxCode ?? ""),
    VatGroup: String(line.VatGroup ?? line.vatGroup ?? line.TaxCode ?? line.taxCode ?? ""),
    // Preserve VatPrcnt even when 0 — 0 is a meaningful tax rate, not "missing"
    // Prefer TaxPercentagePerRow (actual rate SAP applied) over raw VatPrcnt
    VatPrcnt: Number(
      line.TaxPercentagePerRow ?? line.TaxPercentagePerRow ?? line.VatPrcnt ?? line.vatPrcnt ?? 0,
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
