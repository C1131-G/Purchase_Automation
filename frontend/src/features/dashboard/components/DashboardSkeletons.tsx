export function KpiRowSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white border border-zinc-200/60 rounded-2xl p-5 shadow-sm flex flex-col gap-2.5 animate-pulse"
        >
          <div className="h-3.5 w-24 bg-zinc-200 rounded-md" />
          <div className="h-7 w-36 bg-zinc-200 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function ModuleTilesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <div
          key={i}
          className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-start h-[155px] animate-pulse"
        >
          <div className="h-4 w-32 bg-zinc-200 rounded-md" />
          <div className="h-9 w-20 bg-zinc-200 rounded-md mt-6" />
        </div>
      ))}
    </div>
  );
}

export function ModuleCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-zinc-200/60 bg-white p-5 shadow-sm animate-pulse flex flex-col"
        >
          <div className="flex items-start justify-between">
            <div className="h-5 w-28 bg-zinc-200 rounded-md" />
            <div className="h-4 w-4 bg-zinc-200 rounded-md" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">
            {[1, 2, 3, 4].map((statIndex) => (
              <div key={statIndex} className="flex flex-col gap-1.5">
                <div className="h-3 w-16 bg-zinc-100 rounded-md" />
                <div className="h-5 w-20 bg-zinc-200 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrendChartSkeleton() {
  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4 h-[350px] animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 w-40 bg-zinc-200 rounded-md" />
        <div className="h-4 w-24 bg-zinc-100 rounded-md" />
      </div>
      <div className="flex-1 w-full bg-zinc-50 rounded-xl flex items-end justify-between p-4 gap-3">
        {[20, 40, 60, 30, 80, 50, 70, 45, 90, 60, 40, 75].map((h, i) => (
          <div key={i} style={{ height: `${h}%` }} className="w-full bg-zinc-200/60 rounded-t-md" />
        ))}
      </div>
    </div>
  );
}

export function FunnelChartSkeleton() {
  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4 animate-pulse">
      <div className="h-5 w-48 bg-zinc-200 rounded-md" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-zinc-50/50 rounded-xl p-4 border border-zinc-100 flex flex-col gap-3"
          >
            <div className="h-3.5 w-24 bg-zinc-200 rounded-md" />
            <div className="h-6 w-20 bg-zinc-200 rounded-md" />
            <div className="h-3 w-16 bg-zinc-100 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-5 shadow-sm flex flex-col gap-4 animate-pulse">
      <div className="h-5 w-36 bg-zinc-200 rounded-md" />
      <div className="flex flex-col gap-3 mt-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-zinc-100">
            <div className="flex flex-col gap-1.5 w-1/2">
              <div className="h-4 bg-zinc-200 rounded-md w-3/4" />
              <div className="h-3 bg-zinc-100 rounded-md w-1/2" />
            </div>
            <div className="h-4 bg-zinc-200 rounded-md w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
