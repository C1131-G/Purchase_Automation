/** Smallest quantity a create/edit document line may keep after input. */
export const MIN_DOCUMENT_LINE_QUANTITY = 1;

export const parseDocumentLineQuantity = (raw: string, options?: { integer?: boolean }): number => {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return MIN_DOCUMENT_LINE_QUANTITY;
  }

  const parsed = options?.integer ? Math.trunc(Number(trimmed)) : Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < MIN_DOCUMENT_LINE_QUANTITY) {
    return MIN_DOCUMENT_LINE_QUANTITY;
  }

  return parsed;
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
