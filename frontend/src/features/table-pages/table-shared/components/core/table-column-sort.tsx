import type { Column, SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import React from "react";

import { cn } from "@/shared/utils/cn";

type TableColumnSortProps<TData, TValue> = React.HTMLAttributes<HTMLDivElement> & {
  column: Column<TData, TValue>;
  title: string;
  sortingState?: SortingState;
};

export function TableColumnSort<TData, TValue>({
  column,
  title,
  sortingState,
  className,
}: TableColumnSortProps<TData, TValue>) {
  const canSort = column.getCanSort();
  const sortFromState = sortingState?.find((entry) => entry.id === column.id);
  const isSorted = sortFromState ? (sortFromState.desc ? "desc" : "asc") : column.getIsSorted();

  if (!canSort) {
    return (
      <div
        className={cn(
          "px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-sans",
          className,
        )}
      >
        {title}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        const current = column.getIsSorted();
        if (current === "asc") {
          column.clearSorting();
          return;
        }
        // Simplified toggle: NONE -> ASC -> NONE
        column.toggleSorting(false); // false argument ensures 'asc'
      }}
      className={cn(
        "group/sort inline-flex items-center justify-start gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer outline-none select-none py-1.5 rounded-lg px-2 hover:text-blue-600",
        isSorted ? "text-blue-600 bg-blue-50/30" : "text-zinc-600",
        className,
      )}
    >
      <span className="font-sans whitespace-nowrap truncate">{title}</span>
      <div className="flex items-center justify-center shrink-0">
        {isSorted === "asc" && <ArrowUp className="size-3.5 stroke-[2.5px]" />}
        {isSorted === "desc" && <ArrowDown className="size-3.5 stroke-[2.5px]" />}
        {!isSorted && (
          <ChevronsUpDown className="size-3.5 text-zinc-300 group-hover/sort:text-blue-500 transition-colors stroke-[2px]" />
        )}
      </div>
    </button>
  );
}
