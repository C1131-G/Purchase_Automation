import { Lock } from 'lucide-react'

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
          <div className="h-11 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100" />
        ) : (
          <input
            id="po-customer-ref-no"
            type="text"
            value={referenceNo}
            readOnly={referenceNoDisabled}
            aria-disabled={referenceNoDisabled}
            onClick={() => {
              if (referenceNoDisabled) onReferenceNoDisabledClick?.()
            }}
            onFocus={() => {
              if (referenceNoDisabled) onReferenceNoDisabledClick?.()
            }}
            onChange={(event) => onReferenceNoChange(event.target.value)}
            placeholder="Reference"
            className={`h-11 w-full rounded-xl border px-4 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 ${
              referenceNoInvalid
                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-200'
                : 'border-zinc-200 bg-zinc-50 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200'
            } ${referenceNoDisabled ? 'cursor-not-allowed border-zinc-300 bg-zinc-100 text-zinc-500 opacity-100' : ''}`}
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
          <div className="h-11 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100" />
        ) : (
          <input
            id="po-remarks"
            type="text"
            value={comments}
            readOnly={commentsDisabled}
            aria-disabled={commentsDisabled}
            onClick={() => {
              if (commentsDisabled) onCommentsDisabledClick?.()
            }}
            onFocus={() => {
              if (commentsDisabled) onCommentsDisabledClick?.()
            }}
            onChange={(event) => onCommentsChange(event.target.value)}
            placeholder="Transaction Remarks"
            className={`h-11 w-full rounded-xl border px-4 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 ${
              commentsInvalid
                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-200'
                : 'border-zinc-200 bg-zinc-50 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200'
            } ${commentsDisabled ? 'cursor-not-allowed opacity-70' : ''}`}
          />
        )}
        {commentsInvalid && commentsErrorText ? (
          <p className="mt-1 text-xs text-red-600">{commentsErrorText}</p>
        ) : null}
      </div>
    </SectionCard>
  )
}
