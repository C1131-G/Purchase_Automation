export interface ResolveDocumentLineDiscountInput {
  line: Record<string, unknown>;
  grossAmount: number;
  headerDiscountPercent?: number;
}

export interface ResolvedDocumentLineDiscount {
  discountPercent: number;
  discountAmount: number;
}

export function resolveDocumentLineDiscount({
  line,
  grossAmount,
  headerDiscountPercent = 0,
}: ResolveDocumentLineDiscountInput): ResolvedDocumentLineDiscount {
  const apiDiscountPercent = Number(line.DiscountPercent ?? Number.NaN);
  const lineTotal = Number(line.LineTotal ?? Number.NaN);
  const derivedDiscountAmountFromLineTotal =
    Number.isFinite(lineTotal) && grossAmount > 0 ? grossAmount - lineTotal : 0;

  let discountPercent = Number.isFinite(apiDiscountPercent)
    ? apiDiscountPercent
    : grossAmount > 0
      ? (derivedDiscountAmountFromLineTotal / grossAmount) * 100
      : 0;

  if (discountPercent === 0 && headerDiscountPercent !== 0) {
    discountPercent = headerDiscountPercent;
  }

  return {
    discountPercent,
    discountAmount: (grossAmount * discountPercent) / 100,
  };
}
