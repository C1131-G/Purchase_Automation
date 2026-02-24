// ReferenceGrid: Capture and display document-level remarks and attachments.
import { SectionCard } from '@/features/create-pages/create-shared/components/core/section-card'

type ReferenceGridProps = {
  referenceNo: string
  comments: string
  loading?: boolean
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
  onReferenceNoChange,
  onCommentsChange,
  referenceNoInvalid,
  commentsInvalid,
  referenceNoErrorText,
  commentsErrorText,
}: ReferenceGridProps) {
  return (
    <SectionCard title="Reference" className="lg:col-span-1">
      <div>
        <label
          htmlFor="po-customer-ref-no"
          className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500"
        >
          Customer Ref No{' '}
          <span className="text-red-500" aria-hidden="true">
            *
          </span>
        </label>
        {loading ? (
          <div className="h-11 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100" />
        ) : (
          <input
            id="po-customer-ref-no"
            type="text"
            value={referenceNo}
            onChange={(event) => onReferenceNoChange(event.target.value)}
            placeholder="Reference"
            className={`h-11 w-full rounded-xl border px-4 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 ${
              referenceNoInvalid
                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-200'
                : 'border-zinc-200 bg-zinc-50 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200'
            }`}
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
          Remarks{' '}
          <span className="text-red-500" aria-hidden="true">
            *
          </span>
        </label>
        {loading ? (
          <div className="h-11 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100" />
        ) : (
          <input
            id="po-remarks"
            type="text"
            value={comments}
            onChange={(event) => onCommentsChange(event.target.value)}
            placeholder="Transaction Remarks"
            className={`h-11 w-full rounded-xl border px-4 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 ${
              commentsInvalid
                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-200'
                : 'border-zinc-200 bg-zinc-50 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200'
            }`}
          />
        )}
        {commentsInvalid && commentsErrorText ? (
          <p className="mt-1 text-xs text-red-600">{commentsErrorText}</p>
        ) : null}
      </div>
    </SectionCard>
  )
}
