function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-zinc-100 ${className}`} />;
}

function SectionShell({ titleWidth, children }: { titleWidth: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <Pulse className={`h-3.5 ${titleWidth}`} />
      </div>
      {children}
    </div>
  );
}

function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Pulse className="h-2.5 w-24" />
      <Pulse className="h-10 w-full rounded-xl bg-zinc-50" />
    </div>
  );
}

export function OutgoingPaymentEditSkeleton() {
  return (
    <div className="w-full bg-zinc-50 p-3 pb-20">
      {/* Breadcrumb bar - matching CreatePageWrapper exactly */}
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-200/60 bg-zinc-50/50 px-3.5 py-1.5 text-xs font-medium text-zinc-600 transition-all duration-300 hover:border-zinc-300/80 hover:bg-white hover:shadow-xs">
        <Pulse className="h-3 w-16" />
        <Pulse className="size-3 rounded-sm bg-zinc-200" />
        <Pulse className="h-3 w-20" />
        <Pulse className="size-3 rounded-sm bg-zinc-200" />
        <Pulse className="h-3 w-36" />
        <Pulse className="size-3 rounded-sm bg-zinc-200" />
        <Pulse className="h-3 w-28" />
      </div>

      {/* Row 1: Vendor Info | Payment Details */}
      <div className="grid gap-3 lg:grid-cols-2">
        <SectionShell titleWidth="w-20">
          <div className="space-y-4">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
        </SectionShell>

        <SectionShell titleWidth="w-28">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Pulse className="h-2.5 w-24" />
                <Pulse className="h-10 w-full rounded-xl bg-zinc-50" />
              </div>
              <div className="space-y-1.5">
                <Pulse className="h-2.5 w-28" />
                <Pulse className="h-10 w-full rounded-xl bg-zinc-50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Pulse className="h-2.5 w-16" />
              <Pulse className="h-16 w-full rounded-xl bg-zinc-50" />
            </div>
          </div>
        </SectionShell>
      </div>

      {/* Paid Documents + Summary */}
      <div className="mt-4 flex gap-4 items-start">
        <div className="flex-1 rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
          <div className="bg-zinc-50 px-5 py-4 border-b border-zinc-100">
            <Pulse className="h-3.5 w-32" />
          </div>

          <div className="max-h-[400px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white sticky top-0 shadow-sm">
                <tr>
                  <th className="px-5 py-3 w-12">
                    <Pulse className="h-3 w-5" />
                  </th>
                  <th className="px-5 py-3">
                    <Pulse className="h-3 w-10" />
                  </th>
                  <th className="px-5 py-3">
                    <Pulse className="h-3 w-14" />
                  </th>
                  <th className="px-5 py-3 text-right">
                    <Pulse className="h-3 w-20 ml-auto" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {[1, 2, 3].map((row) => (
                  <tr key={row}>
                    <td className="px-5 py-3">
                      <Pulse className="h-5 w-5 rounded bg-blue-100" />
                    </td>
                    <td className="px-5 py-3">
                      <Pulse className="h-5 w-20 rounded-md" />
                    </td>
                    <td className="px-5 py-3">
                      <Pulse className="h-3 w-16" />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Pulse className="h-3 w-20 ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="w-80 rounded-2xl border border-zinc-100 bg-white shadow-sm p-5 sticky top-4">
          <div className="mb-4 flex items-center justify-between">
            <Pulse className="h-3.5 w-32" />
          </div>

          <div className="space-y-3 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between">
                <Pulse className="h-3 w-24" />
                <Pulse className="h-3 w-20" />
              </div>
            ))}
            <div className="border-t border-zinc-100 pt-3 flex justify-between">
              <Pulse className="h-3.5 w-20" />
              <Pulse className="h-5 w-24" />
            </div>
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-4">
            <Pulse className="h-10 w-full rounded-xl" />
          </div>

          <div className="mb-4 mt-8 flex items-center justify-between border-t border-zinc-100 pt-6">
            <Pulse className="h-3.5 w-28" />
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex justify-between mb-2">
                <Pulse className="h-3 w-24" />
                <Pulse className="h-3 w-16" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Pulse className="h-2.5 w-24" />
                  <Pulse className="h-2.5 w-16" />
                </div>
                <div className="flex justify-between">
                  <Pulse className="h-2.5 w-28" />
                  <Pulse className="h-2.5 w-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
