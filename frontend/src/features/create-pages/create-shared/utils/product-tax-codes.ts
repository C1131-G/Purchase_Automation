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
const ratesMatch = (left: number, right: number): boolean =>
  Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 0.000_001;

/** IN-18 → OUT-18 (and the reverse) when the partner uses standard prefixes. */
const mirrorTaxCode = (code: string, side: TaxDocumentSide): string => {
  const want = side === "sales" ? "OUT" : "IN";
  const from = side === "sales" ? "IN" : "OUT";
  const swap = code.match(new RegExp(`^${from}([-_\\s]?)(.+)$`, "i"));
  if (!swap) {
    return "";
  }
  return `${want}${swap[1] ?? ""}${swap[2] ?? ""}`;
};

/**
 * Map a stored tax group onto the document side (purchase I / sales O).
 * RFQ stores buyer purchase tax; seller UI must show the matching sales code.
 * Returns the original code when it is already on-side or no match exists.
 */
export const mapTaxCodeForSide = (
  codes: CreateLookupOption[],
  sourceCode: string | undefined,
  side: TaxDocumentSide,
): string => {
  const code = normalizeCode(sourceCode);
  if (!code) {
    return "";
  }

  const wanted = SIDE_CATEGORY[side];
  const source = codes.find(
    (item) => normalizeCode(item.code).toLowerCase() === code.toLowerCase(),
  );
  const sourceCategory = normalizeCode(source?.category).toUpperCase();
  if (!sourceCategory || sourceCategory === wanted) {
    return code;
  }

  const sourceRate = Number(source?.rate ?? 0);
  const candidates = codes.filter((item) => {
    const category = normalizeCode(item.category).toUpperCase();
    return category === wanted && ratesMatch(Number(item.rate ?? 0), sourceRate);
  });
  if (candidates.length === 0) {
    return code;
  }

  const mirror = mirrorTaxCode(code, side).toLowerCase();
  const exactMirror = candidates.find((item) => normalizeCode(item.code).toLowerCase() === mirror);
  if (exactMirror) {
    return exactMirror.code;
  }

  const wantPrefix = side === "sales" ? "OUT" : "IN";
  const prefixed = candidates.find((item) =>
    normalizeCode(item.code).toUpperCase().startsWith(wantPrefix),
  );
  return (prefixed ?? candidates[0])?.code ?? code;
};

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
