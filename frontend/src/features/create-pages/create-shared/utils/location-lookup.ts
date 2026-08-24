import { formatWarehouseDisplay } from "./create-order.utils";
import { formatBranchDisplay } from "./document-branch";

export type LocationLookupItem = {
  code: string;
  name: string;
};

const normalize = (value: string) => value.trim().toLowerCase();

/** Search by name or code, while keeping empty input as the complete list. */
export const filterLocationLookupOptions = <T extends LocationLookupItem>(
  items: readonly T[],
  value: string,
): T[] => {
  const term = normalize(value);
  if (!term) {
    return [...items];
  }
  return items.filter(
    (item) => normalize(item.name).includes(term) || normalize(item.code).includes(term),
  );
};

/** Auto-commit only canonical codes or complete formatted displays. */
export const findWarehouseSelection = <T extends LocationLookupItem>(
  items: readonly T[],
  value: string,
): T | undefined => {
  const term = normalize(value);
  if (!term) {
    return undefined;
  }
  return items.find(
    (item) =>
      normalize(item.code) === term ||
      normalize(formatWarehouseDisplay(item.name, item.code)) === term,
  );
};

/** Auto-commit only canonical branch codes or complete formatted displays. */
export const findBranchSelection = <T extends LocationLookupItem>(
  items: readonly T[],
  value: string,
): T | undefined => {
  const term = normalize(value);
  if (!term) {
    return undefined;
  }
  return items.find(
    (item) =>
      normalize(item.code) === term ||
      normalize(formatBranchDisplay(item.name, item.code)) === term,
  );
};
