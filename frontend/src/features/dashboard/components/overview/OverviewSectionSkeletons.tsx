/** Loading shells for Overview sections (P5). */

export function NeedsAttentionSkeleton() {
  return (
    <section
      aria-label="Needs attention"
      aria-busy="true"
      className="flex min-h-[220px] flex-col rounded-xl border border-zinc-200 bg-white"
    >
      <div className="border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Needs attention</h2>
        <p className="mt-0.5 text-xs text-zinc-400">AR invoices waiting for approval</p>
      </div>
      <div className="flex flex-1 animate-pulse flex-col gap-3 p-4">
        {[1, 2, 3, 4].map((row) => (
          <div key={row} className="flex items-center gap-3">
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
    <div
      aria-hidden
      className="flex min-h-[220px] animate-pulse flex-col rounded-xl border border-zinc-200 bg-white"
    >
      <div className="border-b border-zinc-100 px-4 py-3">
        <div className="h-4 w-40 rounded bg-zinc-200" />
        <div className="mt-2 h-3 w-48 rounded bg-zinc-100" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        {[1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <div className="h-3.5 flex-1 rounded bg-zinc-200" />
            <div className="h-3.5 w-16 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatementSkeleton() {
  return (
    <div
      aria-hidden
      className="flex min-h-[180px] animate-pulse flex-col rounded-xl border border-zinc-200 bg-white"
    >
      <div className="border-b border-zinc-100 px-4 py-3">
        <div className="h-4 w-24 rounded bg-zinc-200" />
        <div className="mt-2 h-3 w-56 rounded bg-zinc-100" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3 p-4">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((cell) => (
            <div key={cell} className="h-14 rounded-lg bg-zinc-100" />
          ))}
        </div>
        <div className="mt-1 h-8 rounded-lg bg-zinc-50" />
      </div>
    </div>
  );
}
