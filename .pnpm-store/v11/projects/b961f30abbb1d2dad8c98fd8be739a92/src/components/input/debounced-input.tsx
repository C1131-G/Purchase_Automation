import { useEffect, useId, useRef, useState } from "react";

import type { DebouncedInputProps } from "@/components/types/input.types";

/**
 * DebouncedInput: State-optimized entry field for high-frequency updates (e.g., search).
 * PERFORMANCE: Throttles `onChange` emissions to reduce expensive parent re-renders.
 */
export function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 350,
  id,
  name,
  ...props
}: DebouncedInputProps) {
  const [value, setValue] = useState(initialValue);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoId = useId();
  const resolvedId = id ?? autoId;
  const resolvedName = name ?? resolvedId;

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(
    () => () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    },
    [],
  );

  return (
    <input
      {...props}
      id={resolvedId}
      name={resolvedName}
      autoComplete="off"
      value={value}
      onChange={(e) => {
        const nextValue = e.target.value;
        setValue(nextValue);

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          onChange(nextValue);
        }, debounce);
      }}
    />
  );
}
