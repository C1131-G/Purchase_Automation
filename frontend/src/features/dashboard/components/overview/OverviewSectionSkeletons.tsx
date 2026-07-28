/** Loading shells for Overview sections — match tinted card chrome. */

export function ConnectedPartnersSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-full min-h-[320px] w-full animate-pulse flex-col overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-sm"
    >
      <div className="border-b border-violet-100 bg-violet-50/50 px-5 py-4">
        <div className="h-4 w-44 rounded-md bg-violet-100" />
        <div className="mt-2 h-3 w-52 rounded-md bg-violet-50" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        {[1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <div className="h-6 w-14 rounded-md bg-violet-100" />
            <div className="h-3.5 flex-1 rounded bg-zinc-100" />
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
      className="flex min-h-[200px] animate-pulse flex-col overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-sm"
    >
      <div className="border-b border-teal-100 bg-teal-50/50 px-5 py-4">
        <div className="h-4 w-24 rounded-md bg-teal-100" />
        <div className="mt-2 h-3 w-56 rounded-md bg-teal-50" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4 p-5">
        <div className="grid grid-cols-4 gap-3">
          {["bg-emerald-50", "bg-sky-50", "bg-amber-50", "bg-rose-50"].map((tone) => (
            <div key={tone} className={`h-16 rounded-xl ${tone}`} />
          ))}
        </div>
        <div className="h-14 rounded-xl bg-teal-50/80" />
      </div>
    </div>
  );
}
