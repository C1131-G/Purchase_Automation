function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-200/70 ${className}`} />;
}

function SectionShell({ titleWidth, children }: { titleWidth: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-5 flex items-center gap-2">
        <Pulse className="size-1.5 rounded-full bg-zinc-300/80" />
        <Pulse className={`h-3 ${titleWidth}`} />
      </div>
      {children}
    </section>
  );
}

function FieldSkeleton({
  labelWidth = "w-24",
  height = "h-10",
}: {
  labelWidth?: string;
  height?: string;
}) {
  return (
    <div className="space-y-2">
      <Pulse className={`h-2.5 ${labelWidth}`} />
      <Pulse className={`${height} w-full rounded-lg`} />
    </div>
  );
}

function IconButtonSkeleton() {
  return <Pulse className="size-9 rounded-lg" />;
}

export function CreateOutgoingPaymentSkeleton() {
  return (
    <div className="w-full bg-zinc-50/60 p-3 pb-20">
      {/* Breadcrumb bar — matches CreatePageWrapper */}
      <div className="mb-4 inline-flex flex-wrap items-center gap-2 whitespace-nowrap rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-2 text-xs font-medium text-zinc-600 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.28)] backdrop-blur-sm">
        <Pulse className="h-3 w-32" />
        <Pulse className="size-3.5 rounded-sm bg-zinc-200/80" />
        <Pulse className="h-3 w-36" />
        <Pulse className="size-3.5 rounded-sm bg-zinc-200/80" />
        <Pulse className="h-3 w-40" />
      </div>

      {/* Row 1: Vendor Info | Payment Details */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Vendor Info Card */}
        <SectionShell titleWidth="w-20">
          <div className="space-y-5">
            <div className="flex gap-2">
              <div className="flex-1">
                <FieldSkeleton labelWidth="w-20" height="h-10" />
              </div>
              <IconButtonSkeleton />
            </div>
            <FieldSkeleton labelWidth="w-28" height="h-10" />
          </div>
        </SectionShell>

        {/* Payment Details Card */}
        <SectionShell titleWidth="w-32">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FieldSkeleton labelWidth="w-20" height="h-10" />
              <FieldSkeleton labelWidth="w-24" height="h-10" />
            </div>
            <FieldSkeleton labelWidth="w-16" height="h-20" />
          </div>
        </SectionShell>
      </div>

      {/* Documents to Pay + Payment Summary */}
      <div className="mt-4 flex gap-4 items-start">
        {/* Documents to Pay Card */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {/* Card header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Pulse className="size-1.5 rounded-full bg-zinc-300/80" />
              <Pulse className="h-3 w-32" />
            </div>
            <Pulse className="h-7 w-28 rounded-lg" />
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[40px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-zinc-100 bg-zinc-50/50 px-5 py-3">
            <Pulse className="h-3 w-4" />
            <Pulse className="h-3 w-16" />
            <Pulse className="h-3 w-20" />
            <Pulse className="h-3 w-16" />
            <Pulse className="h-3 w-20" />
          </div>

          {/* Table rows */}
          <div className="divide-y divide-zinc-50">
            {[1, 2, 3, 4, 5].map((row) => (
              <div
                key={row}
                className="grid grid-cols-[40px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-5 py-3.5"
              >
                <Pulse className="h-4 w-4 rounded-sm" />
                <Pulse className="h-3.5 w-28" />
                <Pulse className="h-3.5 w-32" />
                <Pulse className="h-3.5 w-20" />
                <Pulse className="h-3.5 w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* Payment Summary Panel */}
        <div className="w-80 shrink-0 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {/* Summary header */}
          <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-4">
            <Pulse className="size-1.5 rounded-full bg-zinc-300/80" />
            <Pulse className="h-3 w-32" />
          </div>

          <div className="space-y-5 p-5">
            {/* Payment on Account toggle */}
            <div className="rounded-xl border border-blue-100/60 bg-blue-50/40 p-3">
              <div className="flex items-center gap-3">
                <Pulse className="size-4 rounded" />
                <Pulse className="h-3 w-32" />
              </div>
            </div>

            {/* Totals rows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Pulse className="h-3 w-28" />
                <Pulse className="h-3 w-20" />
              </div>
              <div className="flex items-center justify-between">
                <Pulse className="h-3 w-32" />
                <Pulse className="h-3 w-20" />
              </div>
              <div className="flex items-center justify-between">
                <Pulse className="h-3 w-24" />
                <Pulse className="h-3 w-20" />
              </div>
              <div className="border-t border-zinc-100 pt-3">
                <div className="flex items-center justify-between">
                  <Pulse className="h-3.5 w-16" />
                  <Pulse className="h-4 w-24" />
                </div>
              </div>
            </div>

            {/* Submit button */}
            <Pulse className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
