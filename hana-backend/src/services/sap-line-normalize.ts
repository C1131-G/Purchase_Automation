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
  let discountPercent = Number(line.DiscountPercent ?? line.discountPercent ?? 0) || 0;
  const lineTotal = Number(line.LineTotal ?? line.lineTotal ?? 0) || 0;

  // Start with the given price (HANA gives post-discount usually, SL gives post-discount usually)
  let unitPrice = Number(line.Price ?? line.UnitPrice ?? line.price ?? line.unitPrice ?? 0) || 0;

  if (discountPercent !== 0) {
    // 2. If Service Layer gave us PriceBefDi (Price Before Discount), USE IT!
    if (line.PriceBefDi !== undefined || line.priceBefDi !== undefined) {
      unitPrice = Number(line.PriceBefDi ?? line.priceBefDi);
    }
    // 3. Otherwise, back-calculate carefully
    else if (unitPrice > 0) {
      const discountMultiplier = 1 - discountPercent / 100;
      const reconstructedPrice = unitPrice / discountMultiplier;

      unitPrice = Math.round(reconstructedPrice * 1000000) / 1000000;

      const twoDecimals = Math.round(unitPrice * 100) / 100;
      if (Math.abs(unitPrice - twoDecimals) < 0.005) {
        unitPrice = twoDecimals;
      }
    }
  } else {
    // If SAP zeroes out negative DiscountPercent, but PriceBefDi differs from Price,
    // it's a surcharge. We reconstruct the negative discount percent.
    const priceBefDi = Number(line.PriceBefDi ?? line.priceBefDi ?? 0);
    const currentPrice = Number(line.Price ?? line.price ?? unitPrice);
    if (priceBefDi > 0 && Math.abs(priceBefDi - currentPrice) > 0.0001) {
      const reconstructedDiscountPercent = (1 - currentPrice / priceBefDi) * 100;
      discountPercent = Math.round(reconstructedDiscountPercent * 100) / 100;
      unitPrice = priceBefDi;
    }
  }

  const reqDate = String(
    line.ReqDate ??
      line.reqDate ??
      line.RequiredDate ??
      line.requiredDate ??
      line.PQTReqDate ??
      line.pqtReqDate ??
      "",
  )
    .trim()
    .slice(0, 10);

  // PQ split fields: keep as true SAP values (do not merge Quantity ↔ RequiredQuantity).
  // Quantity = quoted qty; RequiredQuantity = PQT1.PQTReqQty (required qty).
  // ShipDate = quoted date; ReqDate = required date.
  const requiredQuantity = Number(
    line.RequiredQuantity ?? line.requiredQuantity ?? line.PQTReqQty ?? line.pqtReqQty ?? 0,
  );
  const shipDateRaw = line.ShipDate ?? line.shipDate ?? line.QuotedDate ?? line.quotedDate;
  const shipDate =
    shipDateRaw !== undefined && shipDateRaw !== null && String(shipDateRaw).trim()
      ? String(shipDateRaw).trim().slice(0, 10)
      : "";

  return {
    ItemCode: String(line.ItemCode ?? line.itemCode ?? ""),
    ItemDescription: String(line.ItemDescription ?? line.itemDescription ?? ""),
    Quantity: quantity,
    RequiredQuantity: Number.isFinite(requiredQuantity) ? requiredQuantity : 0,
    OpenQty: Number(
      line.RemainingOpenQuantity ??
        line.remainingOpenQuantity ??
        line.OpenQty ??
        line.OpenQuantity ??
        line.openQty ??
        line.openQuantity ??
        quantity,
    ),
    OpenQuantity: Number(
      line.RemainingOpenQuantity ??
        line.remainingOpenQuantity ??
        line.OpenQuantity ??
        line.OpenQty ??
        line.openQuantity ??
        line.openQty ??
        quantity,
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
    UoMCode: line.UoMCode ?? line.uomCode ?? line.UomCode,
    UoMEntry:
      line.UoMEntry !== undefined || line.uomEntry !== undefined || line.UomEntry !== undefined
        ? Number(line.UoMEntry ?? line.uomEntry ?? line.UomEntry)
        : undefined,
    WarehouseCode: String(line.WarehouseCode ?? line.warehouseCode ?? ""),
    ReqDate: reqDate,
    RequiredDate: reqDate,
    ShipDate: shipDate,
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
