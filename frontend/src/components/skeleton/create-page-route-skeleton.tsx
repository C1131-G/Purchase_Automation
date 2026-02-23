const TOP_CARD_KEYS = ['top-1', 'top-2', 'top-3'] as const
const PRODUCT_ROW_KEYS = ['prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5'] as const
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

function FieldSkeleton() {
  return (
    <div className="space-y-2">
      <Pulse className="h-3 w-28" />
      <Pulse className="h-11 w-full rounded-xl" />
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
        <Pulse className={`h-4 ${titleWidth}`} />
      </div>
      <div className="space-y-3 rounded-b-2xl bg-white px-4 py-3">{children}</div>
    </section>
  )
}

export function CreatePageRouteSkeleton() {
  return (
    <div className="w-full bg-zinc-50 p-3 pb-20">
      <div className="mb-3 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/85 px-4 py-2 text-xs font-medium tracking-normal text-zinc-600 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.32)] backdrop-blur-sm">
        <Pulse className="h-3 w-16" />
        <Pulse className="size-3 rounded-sm bg-zinc-200" />
        <Pulse className="h-3 w-44" />
        <Pulse className="size-3 rounded-sm bg-zinc-200" />
        <Pulse className="h-3 w-32" />
      </div>

      <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        {TOP_CARD_KEYS.map((key) => (
          <SectionShell key={key} titleWidth="w-40">
            <FieldSkeleton />
            <FieldSkeleton />
          </SectionShell>
        ))}
      </div>

      <div className="mt-3 grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
        <SectionShell titleWidth="w-20" className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Pulse className="h-3 w-32" />
              <Pulse className="h-16 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Pulse className="h-3 w-32" />
              <Pulse className="h-16 w-full rounded-xl" />
            </div>
          </div>
        </SectionShell>
        <SectionShell titleWidth="w-24">
          <FieldSkeleton />
          <FieldSkeleton />
        </SectionShell>
      </div>

      <section className="mt-3 rounded-2xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
          <Pulse className="h-4 w-32" />
          <Pulse className="h-11 w-44 rounded-xl" />
        </div>

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
                  <td className="px-3 py-2">
                    <Pulse className="h-4 w-56" />
                  </td>
                  <td className="px-3 py-2">
                    <Pulse className="h-9 w-16 rounded-lg" />
                  </td>
                  <td className="px-3 py-2">
                    <Pulse className="h-4 w-16" />
                  </td>
                  <td className="px-3 py-2">
                    <Pulse className="h-9 w-16 rounded-lg" />
                  </td>
                  <td className="px-3 py-2">
                    <Pulse className="h-9 w-20 rounded-lg" />
                  </td>
                  <td className="px-3 py-2">
                    <Pulse className="h-4 w-16" />
                  </td>
                  <td className="px-3 py-2">
                    <Pulse className="h-4 w-20" />
                  </td>
                  <td className="px-3 py-2">
                    <Pulse className="h-9 w-36 rounded-lg" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Pulse className="ml-auto h-9 w-20 rounded-lg" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-zinc-100 px-4 py-3">
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
          <div className="mt-3 flex items-center justify-between gap-2">
            <Pulse className="h-11 w-36 rounded-xl" />
            <div className="flex items-center gap-2">
              <Pulse className="h-7 w-28 rounded-full" />
              <Pulse className="h-11 w-28 rounded-xl" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
import { type ReactNode } from 'react'
