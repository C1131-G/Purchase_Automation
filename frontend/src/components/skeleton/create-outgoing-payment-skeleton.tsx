import { type ReactNode } from 'react'

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-zinc-100 ${className}`} />
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
      className={`rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm ${className}`.trim()}
    >
      <div className="mb-4">
        <Pulse className={`h-3.5 ${titleWidth}`} />
      </div>
      {children}
    </section>
  )
}

function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Pulse className="h-2.5 w-24" />
      <Pulse className="h-10 w-full rounded-xl" />
    </div>
  )
}

export function CreateOutgoingPaymentSkeleton() {
  return (
    <div className="w-full bg-zinc-50 p-3 pb-8">
      {/* Breadcrumb bar */}
      <div className="mb-3 inline-flex items-center gap-2 whitespace-nowrap rounded-2xl border border-zinc-200/80 bg-white/85 px-4 py-2 text-xs font-medium tracking-normal text-zinc-600 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.32)] backdrop-blur-sm">
        <Pulse className="h-3 w-16" />
        <Pulse className="size-3 rounded-sm bg-zinc-200" />
        <Pulse className="h-3 w-36" />
        <Pulse className="size-3 rounded-sm bg-zinc-200" />
        <Pulse className="h-3 w-40" />
      </div>

      {/* Page title */}
      <div className="mb-4 flex items-center justify-between">
        <Pulse className="h-7 w-64" />
      </div>

      {/* Row 1: Vendor Info | Payment Details */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Vendor Info Card */}
        <SectionShell titleWidth="w-20">
          <div className="space-y-4">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
        </SectionShell>

        {/* Payment Details Card */}
        <SectionShell titleWidth="w-28">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Pulse className="h-2.5 w-24" />
              <Pulse className="h-10 w-full rounded-xl bg-zinc-50" />
            </div>
            <div className="space-y-1.5">
              <Pulse className="h-2.5 w-16" />
              <Pulse className="h-16 w-full rounded-xl" />
            </div>
          </div>
        </SectionShell>
      </div>

      {/* Documents to Pay + Payment Summary */}
      <div className="mt-4 flex gap-4 items-start">
        {/* Documents to Pay Card */}
        <div className="flex-1 rounded-2xl border border-zinc-100 bg-white shadow-sm p-5">
          <div className="mb-3">
            <Pulse className="h-3.5 w-32" />
          </div>
          <Pulse className="w-full h-12 rounded-xl" />
        </div>

        {/* Payment Summary Panel */}
        <div className="w-80 rounded-2xl border border-zinc-100 bg-white shadow-sm p-5 sticky top-4">
          <div className="mb-4 flex items-center justify-between">
            <Pulse className="h-3.5 w-32" />
          </div>

          {/* Payment on Account checkbox */}
          <div className="mb-4 rounded-lg bg-blue-50/50 p-3 border border-blue-100/50">
            <div className="flex items-center gap-3">
              <Pulse className="h-4 w-4 rounded" />
              <Pulse className="h-3.5 w-36" />
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <Pulse className="h-3 w-32" />
              <Pulse className="h-3 w-20" />
            </div>
            <div className="flex justify-between">
              <Pulse className="h-3 w-36" />
              <Pulse className="h-3 w-20" />
            </div>
            <div className="border-t border-zinc-100 pt-3 flex justify-between">
              <Pulse className="h-3.5 w-20" />
              <Pulse className="h-5 w-24" />
            </div>
          </div>

          {/* Submit button */}
          <Pulse className="w-full h-12 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
