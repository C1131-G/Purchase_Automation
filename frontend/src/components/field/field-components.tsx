import React, { useId } from "react";

import { FieldContext, useField } from "@/components/context/field-context";
import type { FieldContextValue } from "@/components/context/field-context";
import type {
  FieldControlProps,
  FieldControlRenderProps,
  FieldDescriptionProps,
  FieldErrorProps,
  FieldLabelProps,
  FieldRootProps,
} from "@/components/types/field.types";
import { cn } from "@/shared/utils/cn";

/**
 * FieldRoot: Architectural container for form field coordination.
 * UX: Generates unified IDs for accessibility (labels, errors, descriptions).
 */
export function FieldRoot({ children, error, className }: FieldRootProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  const value: FieldContextValue = {
    descriptionId,
    errorId,
    id,
  };

  if (error !== undefined) {
    value.error = error;
  }

  return (
    <FieldContext.Provider value={value}>
      <div className={cn("space-y-1.5 w-full", className)}>{children}</div>
    </FieldContext.Provider>
  );
}

export function FieldLabel({ className, children, ...props }: FieldLabelProps) {
  const { id } = useField();

  return (
    <label
      htmlFor={id}
      className={cn(
        "text-[11px] text-ink-900 font-bold uppercase tracking-widest mb-1.5 block px-1 select-none",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function FieldControl({ children, className, ...props }: FieldControlProps) {
  const { id, errorId, descriptionId, error } = useField();

  if (typeof children === "function") {
    return (children as (props: FieldControlRenderProps) => React.ReactNode)({
      "aria-describedby": error ? errorId : descriptionId,
      "aria-invalid": !!error,
      id,
    });
  }

  return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
    "aria-describedby": error ? errorId : descriptionId,
    "aria-invalid": !!error,
    className: cn(
      (children as React.ReactElement<{ className?: string }>).props.className,
      className,
    ),
    id,
    ...props,
  });
}

export function FieldDescription({ className, ...props }: FieldDescriptionProps) {
  const { descriptionId } = useField();
  return (
    <p
      id={descriptionId}
      className={cn("text-[10px] text-neutral-400 font-medium px-1", className)}
      {...props}
    />
  );
}

export function FieldError({ className, ...props }: FieldErrorProps) {
  const { errorId, error } = useField();

  if (!error) {
    return null;
  }

  return (
    <p
      id={errorId}
      className={cn(
        "text-red-600 text-[10px] font-bold uppercase mt-1.5 px-1 animate-in fade-in slide-in-from-top-1",
        className,
      )}
      {...props}
    >
      {error}
    </p>
  );
}
