import { type ReactNode } from 'react'

const PRODUCT_ROW_KEYS = ['prod-1'] as const
const PRODUCT_HEADER_KEYS = [
  'h-product',
  'h-qty',
  'h-price',
  'h-disc-percent',
  'h-disc-amount',
  'h-net',
  'h-total',
  'h-comments',
  'h-actions',
] as const

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-zinc-100 ${className}`} />
}

/** Skeleton replica of a FieldBlock: label + h-10 input with search button icon placeholder */
function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Pulse className="h-2.5 w-24" />
      <div className="relative">
        <Pulse className="h-10 w-full rounded-xl" />
        {/* Search icon pill placeholder */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Pulse className="size-7 rounded-full" />
        </div>
      </div>
    </div>
  )
}

/** Skeleton for a date picker button: label + h-10 button with calendar icon placeholder */
function DatePickerSkeleton() {
  return (
    <div className="space-y-1.5">
      <Pulse className="h-2.5 w-20" />
      <div className="relative">
        <Pulse className="h-10 w-full rounded-xl" />
        {/* Calendar icon pill placeholder */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <Pulse className="size-7 rounded-full" />
        </div>
      </div>
    </div>
  )
}

/** Skeleton for a plain text input (no icon): label + h-11 input */
function InputSkeleton({ height = 'h-11' }: { height?: string }) {
  return (
    <div className="space-y-1.5">
      <Pulse className="h-2.5 w-28" />
      <Pulse className={`${height} w-full rounded-xl`} />
    </div>
  )
}

/** Skeleton for a textarea: label + tall block */
function TextareaSkeleton({ height = 'h-24' }: { height?: string }) {
  return (
    <div className="space-y-2">
      <Pulse className="h-2.5 w-28" />
      <Pulse className={`${height} w-full rounded-xl`} />
    </div>
  )
}

function SectionShell({
  titleWidth,
  className = '',
  children,
}: {
  titleWidth: string
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={`h-full overflow-visible rounded-2xl border border-zinc-200 bg-white ${className}`.trim()}
    >
      <div className="rounded-t-2xl border-b border-zinc-100 px-4 py-2.5">
        <Pulse className={`h-3.5 ${titleWidth}`} />
      </div>
      <div className="space-y-3 rounded-b-2xl bg-white px-4 py-3">{children}</div>
    </section>
  )
}

export function CreatePageRouteSkeleton() {
  return (
    <div className="w-full bg-zinc-50 p-3 pb-20">
      {/* Breadcrumb bar */}
      <div className="mb-3 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/85 px-4 py-2 text-xs font-medium tracking-normal text-zinc-600 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.32)] backdrop-blur-sm">
        <Pulse className="h-3 w-16" />
        <Pulse className="size-3 rounded-sm bg-zinc-200" />
        <Pulse className="h-3 w-44" />
        <Pulse className="size-3 rounded-sm bg-zinc-200" />
        <Pulse className="h-3 w-32" />
      </div>

      {/* Row 1: VendorCustomer | Logistics | DocumentDates */}
      <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        {/* VendorCustomerGrid: 2 FieldBlocks (Name + Code) */}
        <SectionShell titleWidth="w-28">
          <FieldSkeleton />
          <FieldSkeleton />
        </SectionShell>

        {/* LogisticsGrid: Doc Number display + Buyer FieldBlock */}
        <SectionShell titleWidth="w-36">
          {/* Doc Number — static blue badge, no icon */}
          <div className="space-y-1.5">
            <Pulse className="h-2.5 w-24" />
            <Pulse className="h-10 w-full rounded-xl bg-blue-50" />
          </div>
          {/* Buyer field */}
          <FieldSkeleton />
        </SectionShell>

        {/* DocumentDatesGrid: Doc Date + Delivery Date pickers */}
        <SectionShell titleWidth="w-32">
          <div className="grid grid-cols-1 gap-4">
            <DatePickerSkeleton />
            <DatePickerSkeleton />
          </div>
        </SectionShell>
      </div>

      {/* Row 2: AddressGrid (span-2) | ReferenceGrid */}
      <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        {/* AddressGrid: 2-col layout, each with h-24 textarea */}
        <SectionShell titleWidth="w-20" className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TextareaSkeleton />
            <TextareaSkeleton />
          </div>
        </SectionShell>

        {/* ReferenceGrid: Customer Ref No (h-11) + Remarks (h-11) */}
        <SectionShell titleWidth="w-24">
          <InputSkeleton />
          <InputSkeleton />
        </SectionShell>
      </div>

      {/* Product Details Section */}
      <section className="mt-3 rounded-2xl border border-zinc-200 bg-white">
        {/* Section header: title + search button */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
          <Pulse className="h-4 w-32" />
          <Pulse className="h-11 w-40 rounded-xl" />
        </div>

        {/* Table */}
        <div className="overflow-x-auto px-2 py-2">
          <table className="min-w-245 w-full text-left text-sm text-zinc-700">
            <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                {PRODUCT_HEADER_KEYS.map((key) => (
                  <th key={key} className="whitespace-nowrap px-3 py-2">
                    <Pulse className="h-3 w-14" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRODUCT_ROW_KEYS.map((rowKey) => (
                <tr key={rowKey} className="border-b border-zinc-100 last:border-b-0">
                  {/* Product name */}
                  <td className="px-3 py-2">
                    <Pulse className="h-4 w-56" />
                  </td>
                  {/* Qty input */}
                  <td className="px-3 py-2">
                    <Pulse className="h-9 w-16 rounded-lg" />
                  </td>
                  {/* Price */}
                  <td className="px-3 py-2">
                    <Pulse className="h-4 w-16" />
                  </td>
                  {/* Disc % input */}
                  <td className="px-3 py-2">
                    <Pulse className="h-9 w-16 rounded-lg" />
                  </td>
                  {/* Disc Amount input */}
                  <td className="px-3 py-2">
                    <Pulse className="h-9 w-20 rounded-lg" />
                  </td>
                  {/* Net */}
                  <td className="px-3 py-2">
                    <Pulse className="h-4 w-16" />
                  </td>
                  {/* Total */}
                  <td className="px-3 py-2">
                    <Pulse className="h-4 w-20" />
                  </td>
                  {/* Comments input */}
                  <td className="px-3 py-2">
                    <Pulse className="h-9 w-36 rounded-lg" />
                  </td>
                  {/* Actions */}
                  <td className="px-3 py-2 text-right">
                    <Pulse className="ml-auto h-9 w-20 rounded-lg" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer: totals + action buttons */}
        <div className="border-t border-zinc-100 px-4 py-3">
          {/* Totals */}
          <div className="ml-auto w-full max-w-sm">
            <div className="space-y-1">
              <div className="flex items-center justify-end gap-3 border-b border-zinc-200/80 py-1">
                <Pulse className="h-3 w-16" />
                <Pulse className="h-3 w-10" />
                <Pulse className="h-4 w-20" />
              </div>
              <div className="flex items-center justify-end gap-3 border-b border-zinc-200/80 py-1">
                <Pulse className="h-3 w-16" />
                <Pulse className="h-3 w-10" />
                <Pulse className="h-4 w-20" />
              </div>
              <div className="flex items-center justify-end gap-3 py-1">
                <Pulse className="h-3 w-20" />
                <Pulse className="h-3 w-10" />
                <Pulse className="h-5 w-20" />
              </div>
            </div>
          </div>
          {/* Action buttons: Back (left) + Save/Create (right) */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <Pulse className="h-11 w-36 rounded-xl" />
            <div className="flex items-center gap-2">
              <Pulse className="h-11 w-28 rounded-xl" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
