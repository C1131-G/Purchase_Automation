import { BadgePercent, ChevronRight } from "lucide-react";

export function SalesDashboard() {
  return (
    <div className="h-full w-full bg-zinc-50 flex flex-col">
      {/* Top Header */}
      <div className="border-b border-zinc-100 bg-white shrink-0">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/85 px-4 py-2 text-xs font-medium tracking-normal text-zinc-600 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.32)] backdrop-blur-sm">
              <span>Home</span>
              <ChevronRight className="size-3.5 text-zinc-300" />
              <span>Dashboard</span>
              <ChevronRight className="size-3.5 text-zinc-300" />
              <span className="text-blue-600 flex items-center gap-1.5 font-bold">
                <BadgePercent className="size-3.5" />
                Sales
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty page body */}
      <div className="flex-1 bg-zinc-50" />
    </div>
  );
}
