/** Shared helpers for master-data batch (hydrate) endpoints. */

export const MAX_MASTER_DATA_BATCH_CODES = 100;

/**
 * Parse comma-separated item codes from a query string.
 * Trims, dedupes, drops empties, and caps at MAX_MASTER_DATA_BATCH_CODES.
 */
export const parseItemCodesParam = (raw: unknown): string[] => {
  if (typeof raw !== "string" || !raw.trim()) {
    return [];
  }
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const part of raw.split(",")) {
    const code = part.trim();
    if (!code || seen.has(code)) {
      continue;
    }
    seen.add(code);
    codes.push(code);
    if (codes.length >= MAX_MASTER_DATA_BATCH_CODES) {
      break;
    }
  }
  return codes;
};
