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
      <div className="mb-3 inline-flex items-center gap-2 whitespace-nowrap rounded-2xl border border-zinc-200/80 bg-white/85 px-4 py-2 text-xs font-medium tracking-normal text-zinc-600 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.32)] backdrop-blur-sm">
        <Pulse className="h-3 w-16" />
        <Pulse className="size-3.5 rounded-sm bg-zinc-200" />
        <Pulse className="h-3 w-36" />
        <Pulse className="size-3.5 rounded-sm bg-zinc-200" />
        <Pulse className="h-3 w-44" />
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
        </div>
      </div>
    </div>
  );
}
