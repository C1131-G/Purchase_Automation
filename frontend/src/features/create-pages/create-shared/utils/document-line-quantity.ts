/** Smallest quantity a create/edit document line may keep after input. */
import { parseNumericDraft } from "@/shared/validation/numeric-input.validation";

export const MIN_DOCUMENT_LINE_QUANTITY = 1;

export const parseDocumentLineQuantity = (raw: string, options?: { integer?: boolean }): number => {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return MIN_DOCUMENT_LINE_QUANTITY;
  }

  const parsed = parseNumericDraft(trimmed, "positiveQuantity");
  if (parsed === undefined) {
    return MIN_DOCUMENT_LINE_QUANTITY;
  }

  return options?.integer ? Math.trunc(parsed) : parsed;
};

export const clampDocumentLineQuantity = (
  value: unknown,
  options?: { integer?: boolean },
): number => {
  if (value === undefined || value === null || value === "") {
    return MIN_DOCUMENT_LINE_QUANTITY;
  }

  return parseDocumentLineQuantity(String(value), options);
};

/** Cap a committed quantity to a positive max (RFQ quoted ≤ required). */
export const capQuantityToMax = (value: number, max: number | null | undefined): number => {
  if (!Number.isFinite(value)) {
    return value;
  }
  const cap = Number(max);
  if (!Number.isFinite(cap) || cap <= 0) {
    return value;
  }
  return value > cap ? cap : value;
};

/**
 * When the typed draft is a complete number above max, return the capped display.
 * Partial drafts (`""`, `"1."`) are left alone so the user can keep typing.
 */
export const capQuantityDraftToMax = (raw: string, max: number | null | undefined): string => {
  const cap = Number(max);
  if (!Number.isFinite(cap) || cap <= 0) {
    return raw;
  }
  const trimmed = raw.trim();
  if (!trimmed || trimmed.endsWith(".")) {
    return raw;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= cap) {
    return raw;
  }
  return String(cap);
};
