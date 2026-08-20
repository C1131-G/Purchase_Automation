import React from "react";

import type { InputProps } from "@/components/types/input.types";
import {
  decimalDraftSchemas,
  numericDraftError,
  type NumericDraftProfile,
} from "@/shared/validation/numeric-input.validation";

type NumericInputProps = Omit<InputProps, "inputMode" | "onChange" | "type" | "value"> & {
  error?: string | undefined;
  onInvalidValue?: (message: string) => void;
  onValueChange: (value: string) => void;
  profile: NumericDraftProfile;
  value: string;
};

/** Text input that keeps only a valid numeric draft and announces rejected edits. */
export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ error, id, onInvalidValue, onValueChange, profile, value, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const [rejectedError, setRejectedError] = React.useState<string>();
    const visibleError = error ?? rejectedError;
    const inputMode =
      profile === "digitsOnly" || profile === "positiveIntegerQuantity" ? "numeric" : "decimal";

    return (
      <>
        <input
          {...props}
          ref={ref}
          id={inputId}
          type="text"
          inputMode={inputMode}
          pattern={
            profile === "digitsOnly" || profile === "positiveIntegerQuantity"
              ? "[0-9]*"
              : "[0-9]*[.][0-9]*"
          }
          aria-describedby={visibleError ? errorId : props["aria-describedby"]}
          aria-errormessage={visibleError ? errorId : undefined}
          aria-invalid={visibleError ? true : props["aria-invalid"]}
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (decimalDraftSchemas[profile].safeParse(nextValue).success) {
              setRejectedError(undefined);
              onValueChange(nextValue);
              return;
            }
            const message = numericDraftError(nextValue, profile) ?? "Enter a valid number.";
            setRejectedError(message);
            onInvalidValue?.(message);
          }}
        />
        {visibleError ? (
          <span id={errorId} role="alert" className="mt-1 block text-xs text-red-700">
            {visibleError}
          </span>
        ) : null}
      </>
    );
  },
);

NumericInput.displayName = "NumericInput";
