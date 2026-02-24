import { CalendarDays } from 'lucide-react'
import { type ComponentProps, type ReactElement, type RefObject } from 'react'

import { Calendar } from '@/components/calendar/calendar'
// DocumentDetailsGrid: Manages core document metadata (DocNum, Dates, Reference).
import { SectionCard } from '@/features/create-pages/create-shared/components/core/section-card'

type ActiveDatePicker = 'doc' | 'delivery' | null

type CalendarWithBoundsProps = ComponentProps<typeof Calendar> & {
  minDate?: Date | undefined
  maxDate?: Date | undefined
}
const CalendarWithBounds = Calendar as unknown as (props: CalendarWithBoundsProps) => ReactElement

type DocumentDetailsGridProps = {
  docDate: string
  docDueDate: string
  loading?: boolean
  today: Date
  activeDatePicker: ActiveDatePicker
  docDateContainerRef: RefObject<HTMLDivElement | null>
  deliveryDateContainerRef: RefObject<HTMLDivElement | null>
  toDisplayDate: (value: string | undefined) => string
  parseISODate: (value: string | undefined) => Date
  toISODate: (value: Date) => string
  onSetActiveDatePicker: (
    value: ActiveDatePicker | ((previous: ActiveDatePicker) => ActiveDatePicker),
  ) => void
  onDocDateChange: (value: string) => void
  onDocDueDateChange: (value: string) => void
  docDueDateInvalid?: boolean
  docDueDateErrorText?: string | undefined
  error?: string | null
}

export function DocumentDetailsGrid({
  docDate,
  docDueDate,
  loading = false,
  today,
  activeDatePicker,
  docDateContainerRef,
  deliveryDateContainerRef,
  toDisplayDate,
  parseISODate,
  toISODate,
  onSetActiveDatePicker,
  onDocDateChange,
  onDocDueDateChange,
  docDueDateInvalid,
  docDueDateErrorText,
  error,
}: DocumentDetailsGridProps) {
  return (
    <SectionCard title="Document Details" className="lg:col-span-1">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
      <div>
        <div className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Doc Number
        </div>
        {loading ? (
          <div className="h-10 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100" />
        ) : (
          <div className="flex h-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-base font-semibold text-blue-700">
            Generated on Save
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div ref={docDateContainerRef} className="relative">
          <label
            htmlFor="po-doc-date"
            className="mb-2 block whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500"
          >
            Doc Date
          </label>
          {loading ? (
            <div className="h-11 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100" />
          ) : (
            <button
              id="po-doc-date"
              type="button"
              onClick={() => onSetActiveDatePicker((prev) => (prev === 'doc' ? null : 'doc'))}
              className="flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-800 outline-none transition hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
            >
              <span>{toDisplayDate(docDate)}</span>
              <CalendarDays className="h-4 w-4 text-zinc-600" />
            </button>
          )}
          {activeDatePicker === 'doc' ? (
            <div className="absolute left-0 top-full z-40 mt-2">
              <CalendarWithBounds
                mode="single"
                selected={parseISODate(docDate)}
                maxDate={today}
                onSelect={(value) => {
                  if (!(value instanceof Date)) return
                  onDocDateChange(toISODate(value))
                  onSetActiveDatePicker(null)
                }}
              />
            </div>
          ) : null}
        </div>

        <div ref={deliveryDateContainerRef} className="relative">
          <label
            htmlFor="po-delivery-date"
            className="mb-2 block whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500"
          >
            Delivery Date{' '}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          {loading ? (
            <div className="h-11 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100" />
          ) : (
            <button
              id="po-delivery-date"
              type="button"
              onClick={() =>
                onSetActiveDatePicker((prev) => (prev === 'delivery' ? null : 'delivery'))
              }
              className={`flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border px-3 text-sm text-zinc-800 outline-none transition hover:bg-white ${
                docDueDateInvalid
                  ? 'border-red-300 bg-red-50 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-200'
                  : 'border-zinc-200 bg-zinc-50 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200'
              }`}
            >
              <span className={docDueDate ? '' : 'text-zinc-400'}>
                {docDueDate ? toDisplayDate(docDueDate) : 'Select delivery date'}
              </span>
              <CalendarDays className="h-4 w-4 text-zinc-600" />
            </button>
          )}
          {activeDatePicker === 'delivery' ? (
            <div className="absolute right-0 top-full z-40 mt-2">
              <CalendarWithBounds
                mode="single"
                minDate={today}
                {...(docDueDate ? { selected: parseISODate(docDueDate) } : {})}
                onSelect={(value) => {
                  if (!(value instanceof Date)) return
                  onDocDueDateChange(toISODate(value))
                  onSetActiveDatePicker(null)
                }}
              />
            </div>
          ) : null}
          {docDueDateInvalid && docDueDateErrorText ? (
            <p className="mt-1 text-xs text-red-600">{docDueDateErrorText}</p>
          ) : null}
        </div>
      </div>
    </SectionCard>
  )
}
