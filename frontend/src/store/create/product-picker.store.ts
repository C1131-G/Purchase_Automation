import { createAppStore } from "@/store/lib/create-store";

/**
 * Atomic Zustand store for product picker selection state.
 *
 * Selection is split into minimal fields:
 * - activePickerKey: which picker context is currently open
 * - selectedCodesByKey: map of picker key -> Set of selected product codes
 */

interface ProductPickerStore {
  /** Which picker context is currently active (e.g. row ID or document key) */
  activePickerKey: string | null;

  /** Selected product codes per picker context */
  selectedCodesByKey: Record<string, Set<string>>;

  /** Open a picker for the given key, optionally seeding initial codes */
  openPicker: (key: string, initialCodes?: Set<string>) => void;

  /** Toggle a product code for the active picker */
  toggleCode: (key: string, code: string) => void;

  /** Replace the entire selection with a single code (for row-level single-select) */
  selectSingle: (key: string, code: string) => void;

  /** Close the picker for the given key */
  closePicker: (key: string) => void;
}

/** Equality guard for two Sets of strings */
function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a === b) {
    return true;
  }
  if (a.size !== b.size) {
    return false;
  }
  for (const v of a) {
    if (!b.has(v)) {
      return false;
    }
  }
  return true;
}

/** Reusable empty set singleton — avoids creating new Set() on every selector call */
export const EMPTY_SET = new Set<string>();

export function createProductPickerStore() {
  return createAppStore<ProductPickerStore>({ name: "product-picker-store" }, (set) => ({
    activePickerKey: null,
    closePicker: (key) =>
      set(
        (prev) => {
          if (prev.activePickerKey !== key) {
            return prev;
          }
          return { activePickerKey: null };
        },
        false,
        "product-picker/closePicker",
      ),
    openPicker: (key, initialCodes) =>
      set(
        (prev) => {
          const existing = prev.selectedCodesByKey[key];

          if (prev.activePickerKey === key && initialCodes) {
            if (existing && setsEqual(existing, initialCodes)) {
              return prev;
            }
          }

          if (!initialCodes && existing && prev.activePickerKey === key) {
            return prev;
          }

          const targetCodes = initialCodes ?? existing ?? EMPTY_SET;

          if (prev.activePickerKey === key && existing && setsEqual(existing, targetCodes)) {
            return prev;
          }

          return {
            activePickerKey: key,
            selectedCodesByKey: {
              ...prev.selectedCodesByKey,
              [key]: targetCodes,
            },
          };
        },
        false,
        "product-picker/openPicker",
      ),
    selectSingle: (key, code) =>
      set(
        (prev) => {
          const singleCodeSet = new Set([code]);
          const existing = prev.selectedCodesByKey[key];

          if (existing && existing.size === 1 && existing.has(code)) {
            return prev;
          }

          return {
            activePickerKey: key,
            selectedCodesByKey: {
              ...prev.selectedCodesByKey,
              [key]: singleCodeSet,
            },
          };
        },
        false,
        "product-picker/selectSingle",
      ),
    selectedCodesByKey: {},
    toggleCode: (key, code) =>
      set(
        (prev) => {
          const existing = prev.selectedCodesByKey[key] ?? EMPTY_SET;
          const hasCode = existing.has(code);

          const next = new Set(existing);
          if (hasCode) {
            next.delete(code);
          } else {
            next.add(code);
          }

          return {
            selectedCodesByKey: {
              ...prev.selectedCodesByKey,
              [key]: next,
            },
          };
        },
        false,
        "product-picker/toggleCode",
      ),
  }));
}

const productPickerStoreApi = createProductPickerStore();

export const useProductPickerStore = productPickerStoreApi.useStore;
export const createProductPickerStoreInstance = productPickerStoreApi.createStore;

export const useActivePickerKey = () => useProductPickerStore((state) => state.activePickerKey);

export const useSelectedCodesForKey = (key: string | null): Set<string> =>
  useProductPickerStore((state) => {
    if (!key) {
      return EMPTY_SET;
    }
    const codes = state.selectedCodesByKey[key];
    return codes ?? EMPTY_SET;
  });

export const useOpenPickerAction = () => useProductPickerStore((state) => state.openPicker);
export const useToggleCodeAction = () => useProductPickerStore((state) => state.toggleCode);
export const useSelectSingleAction = () => useProductPickerStore((state) => state.selectSingle);
export const useClosePickerAction = () => useProductPickerStore((state) => state.closePicker);
