/** Copy Service Layer BatchNumbers / SerialNumbers from a client line onto a SL line. */

export function attachSapLotCollections(
  docLine: Record<string, unknown>,
  item: Record<string, unknown>,
): void {
  const batches = item.BatchNumbers;
  if (Array.isArray(batches) && batches.length > 0) {
    docLine.BatchNumbers = batches;
  }
  const serials = item.SerialNumbers;
  if (Array.isArray(serials) && serials.length > 0) {
    docLine.SerialNumbers = serials;
  }
}
