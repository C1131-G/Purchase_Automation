// FieldBlock: A standardized layout container for form fields, labels, and validation.
import { Lock, Pencil, Search } from 'lucide-react'
import { useId, useRef } from 'react'

type FieldBlockProps = {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onFocus: () => void
  onBlur: () => void
  onOpenPopup: () => void
  loading?: boolean | undefined
  invalid?: boolean | undefined
  errorText?: string | undefined
  disabled?: boolean | undefined
  onDisabledClick?: (() => void) | undefined
  editableHighlight?: boolean | undefined
  /** Visual-only override: disabled fields render with the same background as editable fields. */
  uniformReadOnlyAppearance?: boolean | undefined
}

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-zinc-100 ${className}`} />
}

export function FieldBlock({
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
}: FieldBlockProps) {
  const lastDisabledFeedbackAtRef = useRef(0)
  const inputId = useId()

  const triggerDisabledFeedback = () => {
    if (!disabled || !onDisabledClick) return
    const now = Date.now()
    if (now - lastDisabledFeedbackAtRef.current < 500) return
    lastDisabledFeedbackAtRef.current = now
    onDisabledClick()
  }

  const trimmedLabel = label.trim()
  const isRequired = trimmedLabel.endsWith('*')
  const displayLabel = isRequired ? trimmedLabel.slice(0, -1).trimEnd() : label

  // Show skeleton placeholder when loading
  if (loading) {
    return (
      <div>
        <label
          htmlFor={inputId}
          className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500"
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
    )
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500"
      >
        <span className="inline-flex items-center gap-1.5">
          <span>{displayLabel}</span>
          {disabled ? <Lock className="h-3 w-3 text-zinc-400" aria-hidden="true" /> : null}
          {!disabled && editableHighlight ? (
            <Pencil className="h-3 w-3 text-emerald-600" aria-hidden="true" />
          ) : null}
          {isRequired ? <span className="text-red-500">*</span> : null}
        </span>
      </label>
      <div className="relative">
        <input
          id={inputId}
          autoComplete="off"
          className={`h-10 w-full rounded-xl border pl-3 pr-12 text-sm outline-none transition placeholder:text-zinc-400 ${
            invalid
              ? 'border-red-300 bg-red-50 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-200'
              : editableHighlight
                ? 'border-emerald-300 bg-emerald-50/60 text-zinc-900 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-200'
                : 'border-zinc-200 bg-zinc-50 text-zinc-800 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200'
          } ${
            disabled
              ? `cursor-not-allowed opacity-100 ${
                  uniformReadOnlyAppearance
                    ? 'border-zinc-200 bg-zinc-50 text-zinc-800'
                    : 'border-zinc-300 bg-zinc-100 text-zinc-500'
                }`
              : ''
          }`}
          placeholder={placeholder}
          value={value}
          readOnly={disabled}
          onChange={(event) => {
            if (disabled) return
            // Interaction Layer: Syncs local field changes with global form state.
            onChange(event.target.value)
          }}
          onClick={() => {
            if (!disabled) return
            triggerDisabledFeedback()
          }}
          onFocus={() => {
            if (disabled) {
              triggerDisabledFeedback()
              return
            }
            onFocus()
          }}
          onBlur={onBlur}
        />
        <button
          type="button"
          onClick={() => {
            if (disabled) {
              triggerDisabledFeedback()
              return
            }
            onOpenPopup()
          }}
          className={`absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition ${
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-zinc-100'
          }`}
        >
          <Search className="h-3 w-3" />
        </button>
      </div>
      {invalid && errorText ? <p className="mt-1 text-xs text-red-600">{errorText}</p> : null}
    </div>
  )
}
