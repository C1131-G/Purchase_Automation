import { useEffect, useState } from "react";

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
    const parsed = Number(trimmed);
    onCommit(Number.isFinite(parsed) ? Math.max(min, parsed) : min);
    setDraft(null);
  };

  return (
    <input
      aria-label={ariaLabel}
      className={className}
      inputMode="decimal"
      min={min}
      onBlur={(event) => commit(event.target.value)}
      onChange={(event) => setDraft(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      placeholder="0"
      step="any"
      type="text"
      value={display}
    />
  );
}
