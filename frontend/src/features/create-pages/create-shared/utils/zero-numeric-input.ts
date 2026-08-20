/** Idle display for price / disc % / disc amount: 0.00 unless the user is typing. */
import { parseNumericDraft } from "@/shared/validation/numeric-input.validation";

export function formatZeroNumericDisplay(
  draft: string | undefined,
  value: number,
  options?: { explicitZero?: boolean },
): string {
  if (draft !== undefined) {
    return draft;
  }
  if (value === 0) {
    return options?.explicitZero === false ? "" : "0.00";
  }
  return Number(value).toFixed(2);
}

/** Clear a shown 0.00 on focus so the user can type. Leave a non-zero value selected as-is. */
export function draftAfterZeroNumericFocus(
  existingDraft: string | undefined,
  current: number,
): string | undefined {
  if (existingDraft !== undefined) {
    return existingDraft;
  }
  return current === 0 ? "" : undefined;
}

/** Empty or invalid blur commits 0 so the field returns to 0.00. */
export function commitZeroNumericBlur(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return 0;
  }
  return parseNumericDraft(trimmed, "sapDecimal") ?? 0;
}
