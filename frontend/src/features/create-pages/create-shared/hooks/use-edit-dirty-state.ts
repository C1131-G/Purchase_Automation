import { useMemo, useState } from "react";

/**
 * Configuration for the edit-mode dirty-state tracker.
 *
 * @template T - A record of field values that constitute the editable form state.
 */
export interface UseEditDirtyStateConfig<T extends Record<string, unknown>> {
  /** Whether the form is in edit mode (vs create). */
  isEditMode: boolean;
  /** The current values of every trackable editable field, used for comparison. */
  currentFields: T;
}

/**
 * Return value of {@link useEditDirtyState}.
 *
 * @template T - Same record shape passed via `currentFields`.
 * @template T - Same record shape passed via `currentFields`.
 */
export interface UseEditDirtyStateReturn<T extends Record<string, unknown>> {
  /** `true` when current field values differ from the hydration snapshot. */
  isDirty: boolean;
  /** Derived submit-button disabled flag (disabled when not dirty or when document is closed). */
  submitDisabled: boolean;
  /** The snapshot captured at edit hydration, or `null` before hydration completes. */
  formSnapshot: T | null;
  /** Set the snapshot (pass `null` to reset after save or during form reset). */
  setFormSnapshot: (snapshot: T | null) => void;
}

/**
 * Manages dirty-state tracking for edit pages by comparing current field values
 * against a snapshot captured during edit hydration.
 *
 * - In create mode (`isEditMode=false`), `isDirty` is always `false`.
 * - Resetting `formSnapshot` to `null` clears the dirty state (e.g. after save).
 */
export function useEditDirtyState<T extends Record<string, unknown>>({
  isEditMode,
  currentFields,
}: UseEditDirtyStateConfig<T>): UseEditDirtyStateReturn<T> {
  const [formSnapshot, setFormSnapshot] = useState<T | null>(null);

  const isDirty = useMemo(() => {
    if (!isEditMode || !formSnapshot) {
      return false;
    }
    return JSON.stringify(currentFields) !== JSON.stringify(formSnapshot);
  }, [isEditMode, formSnapshot, currentFields]);

  const submitDisabled = isEditMode ? !isDirty : false;

  return { isDirty, submitDisabled, formSnapshot, setFormSnapshot };
}
