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
