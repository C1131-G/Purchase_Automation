/** Placeholder shells for sections still pending later phases. */

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
