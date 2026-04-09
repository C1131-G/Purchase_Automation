import { create } from 'zustand'

/**
 * Atomic Zustand store for product picker selection state.
 *
 * Selection is split into minimal fields:
 * - activePickerKey: which picker context is currently open
 * - selectedCodesByKey: map of picker key -> Set of selected product codes
 *
 * Actions are narrowly scoped:
 * - openPicker(key, initialCodes): open a picker and seed its selection
 * - toggleCode(key, code): toggle a single product code
 * - closePicker(key): close the current picker
 */

type ProductPickerStore = {
  /** Which picker context is currently active (e.g. row ID or document key) */
  activePickerKey: string | null

  /** Selected product codes per picker context */
  selectedCodesByKey: Record<string, Set<string>>

  /** Open a picker for the given key, optionally seeding initial codes */
  openPicker: (key: string, initialCodes?: Set<string>) => void

  /** Toggle a product code for the active picker */
  toggleCode: (key: string, code: string) => void

  /** Replace the entire selection with a single code (for row-level single-select) */
  selectSingle: (key: string, code: string) => void

  /** Close the picker for the given key */
  closePicker: (key: string) => void
}

/** Equality guard for two Sets of strings */
function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a === b) return true
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

/** Reusable empty set singleton — avoids creating new Set() on every selector call */
export const EMPTY_SET = new Set<string>()

export const useProductPickerStore = create<ProductPickerStore>((set) => ({
  activePickerKey: null,
  selectedCodesByKey: {},

  openPicker: (key, initialCodes) =>
    set((prev) => {
      const existing = prev.selectedCodesByKey[key]

      // If we already have this key active and codes haven't changed, skip entirely
      if (prev.activePickerKey === key && initialCodes) {
        if (existing && setsEqual(existing, initialCodes)) {
          return prev
        }
      }

      // If no initialCodes and key already exists, just activate it without mutation
      if (!initialCodes && existing && prev.activePickerKey === key) {
        return prev
      }

      const targetCodes = initialCodes ?? existing ?? EMPTY_SET

      // If the resulting codes are the same reference or equal content AND key is already active, skip
      if (prev.activePickerKey === key && existing && setsEqual(existing, targetCodes)) {
        return prev
      }

      return {
        activePickerKey: key,
        selectedCodesByKey: {
          ...prev.selectedCodesByKey,
          [key]: targetCodes,
        },
      }
    }),

  toggleCode: (key, code) =>
    set((prev) => {
      const existing = prev.selectedCodesByKey[key] ?? EMPTY_SET
      const hasCode = existing.has(code)

      // If toggling off but code isn't there, or toggling on and it's already there — no-op
      // (This component only uses toggle for toggle-off in single-select context)
      const next = new Set(existing)
      if (hasCode) next.delete(code)
      else next.add(code)

      return {
        selectedCodesByKey: {
          ...prev.selectedCodesByKey,
          [key]: next,
        },
      }
    }),

  selectSingle: (key, code) =>
    set((prev) => {
      const singleCodeSet = new Set([code])
      const existing = prev.selectedCodesByKey[key]

      // Guard: already has exactly this code, skip
      if (existing && existing.size === 1 && existing.has(code)) {
        return prev
      }

      return {
        activePickerKey: key,
        selectedCodesByKey: {
          ...prev.selectedCodesByKey,
          [key]: singleCodeSet,
        },
      }
    }),

  closePicker: (key) =>
    set((prev) => {
      if (prev.activePickerKey !== key) return prev
      return { activePickerKey: null }
    }),
}))

/** Selector: get the active picker key */
export const useActivePickerKey = () => useProductPickerStore((state) => state.activePickerKey)

/** Selector: get selected codes for a specific picker key */
export const useSelectedCodesForKey = (key: string | null): Set<string> =>
  useProductPickerStore((state) => {
    if (!key) return EMPTY_SET
    const codes = state.selectedCodesByKey[key]
    return codes ?? EMPTY_SET
  })

/** Selector: get the openPicker action */
export const useOpenPickerAction = () => useProductPickerStore((state) => state.openPicker)

/** Selector: get the toggleCode action */
export const useToggleCodeAction = () => useProductPickerStore((state) => state.toggleCode)

/** Selector: get the selectSingle action */
export const useSelectSingleAction = () => useProductPickerStore((state) => state.selectSingle)

/** Selector: get the closePicker action */
export const useClosePickerAction = () => useProductPickerStore((state) => state.closePicker)
