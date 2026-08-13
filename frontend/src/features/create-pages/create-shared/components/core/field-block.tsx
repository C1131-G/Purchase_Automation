// FieldBlock: A standardized layout container for form fields, labels, and validation.
import { Lock, Pencil, Search } from "lucide-react";
import { forwardRef, useId, useRef } from "react";

interface FieldBlockProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onOpenPopup?: () => void;
  loading?: boolean | undefined;
  invalid?: boolean | undefined;
  errorText?: string | undefined;
  disabled?: boolean | undefined;
  onDisabledClick?: (() => void) | undefined;
  editableHighlight?: boolean | undefined;
  /** Visual-only override: disabled fields render with the same background as editable fields. */
  uniformReadOnlyAppearance?: boolean | undefined;
  badge?: string | undefined;
}

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-linen-100 ${className}`} />;
}

export const FieldBlock = forwardRef<HTMLInputElement, FieldBlockProps>(function FieldBlock(
  {
    label,
    placeholder,
    value,
    onChange,
    onFocus,
    onBlur,
    onOpenPopup,
    loading,
    invalid,
    errorText,
    disabled,
    onDisabledClick,
    editableHighlight,
    uniformReadOnlyAppearance,
    badge,
  },
  ref,
) {
  const lastDisabledFeedbackAtRef = useRef(0);
  const inputId = useId();

  const triggerDisabledFeedback = () => {
    if (!disabled || !onDisabledClick) {
      return;
    }
    const now = Date.now();
    if (now - lastDisabledFeedbackAtRef.current < 500) {
      return;
    }
    lastDisabledFeedbackAtRef.current = now;
    onDisabledClick();
  };

  const trimmedLabel = label.trim();
  const isRequired = trimmedLabel.endsWith("*");
  const displayLabel = isRequired ? trimmedLabel.slice(0, -1).trimEnd() : label;

  // Show skeleton placeholder when loading
  if (loading) {
    return (
      <div>
        <label
          htmlFor={inputId}
          className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500"
        >
          <span className="inline-flex items-center gap-1.5">
            <span>{displayLabel}</span>
            {isRequired ? <span className="text-red-500">*</span> : null}
          </span>
        </label>
        <div className="relative">
          <Pulse className="h-10 w-full rounded-xl" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Pulse className="h-7 w-7 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500"
      >
        <span className="inline-flex items-center gap-1.5">
          <span>{displayLabel}</span>
          {disabled ? <Lock className="h-3 w-3 text-neutral-400" aria-hidden="true" /> : null}
          {!disabled && editableHighlight ? (
            <Pencil className="h-3 w-3 text-emerald-600" aria-hidden="true" />
          ) : null}
          {isRequired ? <span className="text-red-500">*</span> : null}
        </span>
      </label>
      <div className="relative">
        <input
          id={inputId}
          ref={ref}
          autoComplete="off"
          className={`h-10 w-full rounded-xl border pl-3 text-sm outline-none transition placeholder:text-neutral-400 ${
            badge ? "pr-24" : "pr-12"
          } ${
            invalid
              ? "border-red-300 bg-red-50 focus:border-red-400 focus:bg-surface focus:ring-2 focus:ring-red-200"
              : editableHighlight
                ? "border-emerald-300 bg-emerald-50/60 text-ink-900 focus:border-emerald-400 focus:bg-surface focus:ring-2 focus:ring-emerald-200"
                : "border-linen-200 bg-field-silver text-ink-900 focus:border-teal-400 focus:bg-surface focus:ring-2 focus:ring-teal-200"
          } ${
            disabled
              ? `cursor-not-allowed opacity-100 ${
                  uniformReadOnlyAppearance
                    ? "border-linen-200 bg-field-silver text-ink-900"
                    : "border-linen-200 bg-linen-100 text-neutral-500"
                }`
              : ""
          }`}
          placeholder={placeholder}
          value={value}
          readOnly={disabled}
          onChange={(event) => {
            if (disabled) {
              return;
            }
            // Interaction Layer: Syncs local field changes with global form state.
            onChange(event.target.value);
          }}
          onClick={() => {
            if (!disabled) {
              return;
            }
            triggerDisabledFeedback();
          }}
          onFocus={() => {
            if (disabled) {
              triggerDisabledFeedback();
              return;
            }
            onFocus();
          }}
          onBlur={onBlur}
        />
        {badge ? (
          <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 flex h-5 items-center justify-center rounded bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20 px-1.5 text-[10px] font-bold uppercase">
            {badge}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (disabled) {
              triggerDisabledFeedback();
              return;
            }
            onOpenPopup?.();
          }}
          className={`absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border border-linen-200 bg-surface text-neutral-500 transition ${
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-linen-100"
          }`}
        >
          <Search className="h-3 w-3" />
        </button>
      </div>
      {invalid && errorText ? <p className="mt-1 text-xs text-red-600">{errorText}</p> : null}
    </div>
  );
});
