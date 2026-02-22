import { Search } from 'lucide-react'
import { useRef } from 'react'

type FieldBlockProps = {
  label: string
  placeholder: string
  loadingPlaceholder?: string
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
}

export function FieldBlock({
  label,
  placeholder,
  loadingPlaceholder,
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
}: FieldBlockProps) {
  const lastDisabledFeedbackAtRef = useRef(0)

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

  return (
    <div>
      <label className="mb-1.5 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span>{displayLabel}</span>
          {isRequired ? <span className="text-red-500">*</span> : null}
        </span>
      </label>
      <div className="relative">
        <input
          className={`h-10 w-full rounded-xl border pl-3 pr-12 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 ${
            invalid
              ? 'border-red-300 bg-red-50 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-200'
              : 'border-zinc-200 bg-zinc-50 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200'
          } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
          placeholder={loading ? (loadingPlaceholder ?? 'Loading...') : placeholder}
          value={value}
          readOnly={disabled}
          onChange={(event) => {
            if (disabled) return
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
          className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition ${
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
