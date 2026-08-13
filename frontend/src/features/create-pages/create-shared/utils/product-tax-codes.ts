import type { CreateLookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";

export type TaxDocumentSide = "purchase" | "sales";

const SIDE_CATEGORY: Record<TaxDocumentSide, "I" | "O"> = {
  purchase: "I",
  sales: "O",
};

const normalizeCode = (value: string | undefined): string => String(value ?? "").trim();

/** OVTG rate for a tax group. 0 when the code is missing or unknown. */
export const taxRateForCode = (
  codes: Array<Pick<CreateLookupOption, "code" | "rate">>,
  vatGroup: string | undefined,
): number => {
  const code = normalizeCode(vatGroup);
  if (!code) {
    return 0;
  }
  const match = codes.find((item) => normalizeCode(item.code).toLowerCase() === code.toLowerCase());
  const rate = Number(match?.rate ?? 0);
  return Number.isFinite(rate) ? rate : 0;
};

/**
 * Purchase docs: OVTG Category I. Sales docs: Category O.
 * Always keep `currentCode` so edit hydrate does not blank an inactive / other-side code.
 * Rows with empty category stay in the list (older API / uncategorized OVTG).
 */
export const filterTaxCodesForSide = (
  codes: CreateLookupOption[],
  side: TaxDocumentSide,
  currentCode?: string,
): CreateLookupOption[] => {
  const wanted = SIDE_CATEGORY[side];
  const current = normalizeCode(currentCode);
  const filtered = codes.filter((item) => {
    const category = normalizeCode(item.category).toUpperCase();
    if (!category) {
      return true;
    }
    return category === wanted;
  });

  if (!current || filtered.some((item) => normalizeCode(item.code) === current)) {
    return filtered;
  }

  const extra = codes.find((item) => normalizeCode(item.code) === current);
  if (extra) {
    return [extra, ...filtered];
  }
  return [{ code: current, name: current }, ...filtered];
};

export const formatTaxCodeLabel = (
  item: Pick<CreateLookupOption, "code" | "name" | "rate">,
): string => {
  const code = normalizeCode(item.code);
  const name = normalizeCode(item.name);
  const rate = Number(item.rate ?? 0);
  const rateLabel = Number.isFinite(rate) ? `${rate}%` : "0%";
  if (!name || name === code) {
    return `${code} (${rateLabel})`;
  }
  return `${code} — ${name} (${rateLabel})`;
};

/** Fill row tax from the item master code. The UI does not let users change it. */
export const applyTaxCodeToRow = (
  codes: Array<Pick<CreateLookupOption, "code" | "rate">>,
  vatGroup: string,
): { vatGroup: string; taxRate: number } => {
  const code = normalizeCode(vatGroup);
  return {
    taxRate: taxRateForCode(codes, code),
    vatGroup: code,
  };
};
