import { Lock } from 'lucide-react'
import { useEffect, useRef } from 'react'

// ReferenceGrid: Capture and display document-level remarks and attachments.
import { SectionCard } from '@/features/create-pages/create-shared/components/core/section-card'

type ReferenceGridProps = {
  referenceNo: string
  comments: string
  loading?: boolean
  referenceNoDisabled?: boolean
  commentsDisabled?: boolean
  onReferenceNoDisabledClick?: () => void
  onCommentsDisabledClick?: () => void
  onReferenceNoChange: (value: string) => void
  onCommentsChange: (value: string) => void
  referenceNoInvalid?: boolean | undefined
  commentsInvalid?: boolean | undefined
  referenceNoErrorText?: string | undefined
  commentsErrorText?: string | undefined
  /** Visual-only override: read-only fields render with the same background as editable fields. */
  uniformReadOnlyAppearance?: boolean
}

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-zinc-100 ${className}`} />
}

function AutoResizeTextarea({
  value,
  disabled,
  placeholder,
  onChange,
  onClick,
  onFocus,
  invalid,
  invalidStyles,
  disabledStyles,
}: {
  value: string
  disabled: boolean
  placeholder: string
  onChange: (value: string) => void
  onClick?: () => void
  onFocus?: () => void
  invalid?: boolean
  invalidStyles: string
  disabledStyles: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to calculate scrollHeight
    textarea.style.height = 'auto'
    // Set height to scrollHeight (content height)
    const newHeight = Math.max(72, textarea.scrollHeight) // min 72px (4.5rem)
    textarea.style.height = `${newHeight}px`
  }, [value])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      readOnly={disabled}
      aria-disabled={disabled}
      onClick={() => {
        if (disabled) onClick?.()
      }}
      onFocus={() => {
        if (disabled) onFocus?.()
      }}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={1}
      className={`w-full resize-y rounded-xl border px-4 py-2 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 ${
        invalid
          ? invalidStyles
          : 'border-zinc-200 bg-zinc-50 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200'
      } ${disabled ? disabledStyles : ''}`}
    />
  )
}

export function ReferenceGrid({
  referenceNo,
  comments,
  loading = false,
  referenceNoDisabled = false,
  commentsDisabled = false,
  onReferenceNoDisabledClick,
  onCommentsDisabledClick,
  onReferenceNoChange,
  onCommentsChange,
  referenceNoInvalid,
  commentsInvalid,
  referenceNoErrorText,
  commentsErrorText,
  uniformReadOnlyAppearance = false,
}: ReferenceGridProps) {
  return (
    <SectionCard title="REFERENCE" className="lg:col-span-1">
      <div>
        <label
          htmlFor="po-customer-ref-no"
          className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500"
        >
          <span className="inline-flex items-center gap-1.5">
            <span>CUSTOMER REF NO</span>
            {referenceNoDisabled ? (
              <Lock className="h-3 w-3 text-zinc-400" aria-hidden="true" />
            ) : null}
          </span>
        </label>
        {loading ? (
          <Pulse className="min-h-[4.5rem] w-full rounded-xl" />
        ) : (
          <AutoResizeTextarea
            value={referenceNo}
            disabled={referenceNoDisabled}
            placeholder="Reference"
            onChange={onReferenceNoChange}
            onClick={onReferenceNoDisabledClick}
            onFocus={onReferenceNoDisabledClick}
            invalid={referenceNoInvalid}
            invalidStyles="border-red-300 bg-red-50 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-200"
            disabledStyles={
              uniformReadOnlyAppearance
                ? 'cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-800'
                : 'border-zinc-300 bg-zinc-100 text-zinc-500 opacity-100'
            }
          />
        )}
        {referenceNoInvalid && referenceNoErrorText ? (
          <p className="mt-1 text-xs text-red-600">{referenceNoErrorText}</p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="po-remarks"
          className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500"
        >
          <span className="inline-flex items-center gap-1.5">
            <span>REMARKS</span>
            {commentsDisabled ? (
              <Lock className="h-3 w-3 text-zinc-400" aria-hidden="true" />
            ) : null}
          </span>
        </label>
        {loading ? (
          <Pulse className="min-h-[4.5rem] w-full rounded-xl" />
        ) : (
          <AutoResizeTextarea
            value={comments}
            disabled={commentsDisabled}
            placeholder="Transaction Remarks"
            onChange={onCommentsChange}
            onClick={onCommentsDisabledClick}
            onFocus={onCommentsDisabledClick}
            invalid={commentsInvalid}
            invalidStyles="border-red-300 bg-red-50 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-200"
            disabledStyles={
              uniformReadOnlyAppearance
                ? 'cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-800'
                : 'cursor-not-allowed opacity-70'
            }
          />
        )}
        {commentsInvalid && commentsErrorText ? (
          <p className="mt-1 text-xs text-red-600">{commentsErrorText}</p>
        ) : null}
      </div>
    </SectionCard>
  )
}
