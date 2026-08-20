import { useEffect, useState } from "react";

import { NumericInput } from "@/components/input/numeric-input";
import { LOT_TEXT_FIELD_CLASS } from "@/features/create-pages/create-shared/lot-setup/lot-field-styles";
import { parseNumericDraft } from "@/shared/validation/numeric-input.validation";

interface LotQtyInputProps {
  ariaLabel: string;
  className?: string;
  min?: number;
  onCommit: (quantity: number) => void;
  value: number;
}

/**
 * Qty field that can be cleared (including a prefilled 0) while typing.
 * Commits a number on blur / Enter.
 */
export function LotQtyInput({ ariaLabel, className, min = 0, onCommit, value }: LotQtyInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    setDraft(null);
  }, [value]);

  const display = draft ?? (Number.isFinite(value) ? String(value) : "");

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed === "-") {
      onCommit(min);
      setDraft(null);
      return;
    }
    onCommit(Math.max(min, parseNumericDraft(trimmed, "sapDecimal") ?? min));
    setDraft(null);
  };

  return (
    <NumericInput
      aria-label={ariaLabel}
      className={className ?? LOT_TEXT_FIELD_CLASS}
      onBlur={(event) => commit(event.target.value)}
      onValueChange={setDraft}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      placeholder="0"
      profile="sapDecimal"
      value={display}
    />
  );
}
