import type { Column, SortingState } from "@tanstack/react-table";
import { ArrowDown, ChevronsUpDown } from "lucide-react";
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
          "inline-flex items-center justify-start px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-600 font-sans select-none",
          className,
        )}
      >
        <span className="whitespace-nowrap truncate">{title}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        const current = column.getIsSorted();
        if (current === "desc") {
          column.clearSorting(); // Descending -> Unsorted
        } else {
          column.toggleSorting(true); // Unsorted/Ascending -> Descending
        }
      }}
      className={cn(
        "group/sort inline-flex items-center justify-start gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer outline-none select-none py-1.5 rounded-lg px-2 hover:text-teal-700",
        isSorted === "desc" ? "text-teal-700 bg-teal-50" : "text-neutral-600",
        className,
      )}
    >
      <span className="font-sans whitespace-nowrap truncate">{title}</span>
      <div className="flex items-center justify-center shrink-0">
        {isSorted === "desc" && <ArrowDown className="size-3.5 stroke-[2.5px]" />}
        {isSorted !== "desc" && (
          <ChevronsUpDown className="size-3.5 text-neutral-300 group-hover/sort:text-teal-600 transition-colors stroke-[2px]" />
        )}
      </div>
    </button>
  );
}
