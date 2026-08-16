/** Copy Service Layer BatchNumbers / SerialNumbers from a client line onto a SL line. */

const nonemptyArray = (value: unknown): unknown[] | undefined =>
  Array.isArray(value) && value.length > 0 ? value : undefined;

/** Keep lot collections when mapping a Service Layer document line for the portal. */
export const pickSapLotCollections = (line: Record<string, unknown>): Record<string, unknown> => {
  const next: Record<string, unknown> = {};
  const batches = nonemptyArray(line.BatchNumbers);
  if (batches) {
    next.BatchNumbers = batches;
  }
  const serials = nonemptyArray(line.SerialNumbers);
  if (serials) {
    next.SerialNumbers = serials;
  }
  const bins = nonemptyArray(line.DocumentLinesBinAllocations);
  if (bins) {
    next.DocumentLinesBinAllocations = bins;
  }
  return next;
};

export function attachSapLotCollections(
  docLine: Record<string, unknown>,
  item: Record<string, unknown>,
): void {
  const lots = pickSapLotCollections(item);
  Object.assign(docLine, lots);
}
