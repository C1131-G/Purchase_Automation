/** P1 placeholder shells for sections wired in P2–P4. */

export function NeedsAttentionSkeleton() {
  return (
    <section
      aria-label="Needs attention"
      className="flex min-h-[220px] flex-col rounded-xl border border-zinc-200 bg-white"
    >
      <div className="border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Needs attention</h2>
        <p className="mt-0.5 text-xs text-zinc-400">AR invoices waiting for approval</p>
      </div>
      <div className="flex flex-1 animate-pulse flex-col gap-3 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3.5 w-16 rounded bg-zinc-200" />
            <div className="h-3.5 flex-1 rounded bg-zinc-100" />
            <div className="h-3.5 w-14 rounded bg-zinc-200" />
            <div className="h-3.5 w-10 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ConnectedPartnersSkeleton() {
  return (
    <section
      aria-label="Connected vendors and customers"
      className="flex min-h-[220px] flex-col rounded-xl border border-zinc-200 bg-white"
    >
      <div className="border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Connected vendors & customers</h2>
        <p className="mt-0.5 text-xs text-zinc-400">Active intercompany partner links</p>
      </div>
      <div className="flex flex-1 animate-pulse flex-col gap-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3.5 flex-1 rounded bg-zinc-200" />
            <div className="h-3.5 w-16 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function StatementSkeleton() {
  return (
    <section
      aria-label="Statement"
      className="flex min-h-[180px] flex-col rounded-xl border border-zinc-200 bg-white"
    >
      <div className="border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Statement</h2>
        <p className="mt-0.5 text-xs text-zinc-400">Partner balance and aging</p>
      </div>
      <div className="flex flex-1 animate-pulse flex-col justify-center gap-3 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-12 shrink-0 rounded bg-zinc-100" />
            <div
              className="h-3 flex-1 rounded-full bg-zinc-200"
              style={{ maxWidth: `${100 - i * 12}%` }}
            />
            <div className="h-3 w-10 shrink-0 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </section>
  );
}
