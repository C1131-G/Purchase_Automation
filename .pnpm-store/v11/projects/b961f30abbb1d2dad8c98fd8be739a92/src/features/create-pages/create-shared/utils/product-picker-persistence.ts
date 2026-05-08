/**
 * Module-level map that persists product picker selections per row ID.
 * Lives outside React so it's never involved in render cycles.
 *
 * Key   = rowId (string)
 * Value = Set of selected product codes for that row
 */
const rowSelections = new Map<string, Set<string>>();

export function getSavedPickerSelection(rowId: string | null): Set<string> {
  if (!rowId) {
    return new Set<string>();
  }
  return new Set(rowSelections.get(rowId) ?? new Set<string>());
}

export function savePickerSelection(rowId: string, codes: Set<string>): void {
  rowSelections.set(rowId, new Set(codes));
}

export function clearPickerSelection(rowId: string): void {
  rowSelections.delete(rowId);
}

export function resetAllPickerSelections(): void {
  rowSelections.clear();
}
