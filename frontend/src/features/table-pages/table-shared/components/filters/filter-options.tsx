import type { Column, ColumnFiltersState, Table } from "@tanstack/react-table";
import { Check, Filter, RotateCcw } from "lucide-react";
import { useId, useMemo } from "react";

import { usePopover } from "@/components/context/popover-context";
import { Popover } from "@/components/popover";
import { hasFilterValue } from "@/components/types/filter-utils";
import { resolveFilterToggleAction } from "@/features/table-pages/table-shared/components/filters/filter-options.logic";
import { getColumnTitle } from "@/features/table-pages/table-shared/utils/table-utils";
import { cn } from "@/shared/utils/cn";
import { useClearDateFilterDraftAction } from "@/store/table/table-filter.store";
import { useClearAllFiltersAction } from "@/store/table/table-filter.store";
import { useSetActiveFilterAction } from "@/store/table/table-filter.store";
import { useSetColumnFiltersAction } from "@/store/table/table-filter.store";
import { useTableActiveFilter } from "@/store/table/table-filter.store";
import { useTableColumnFilters } from "@/store/table/table-filter.store";

interface TableFilterOptionsProps<TData> {
  tableId: string;
  table: Table<TData>;
}

export function TableFilterOptions<TData>({ tableId, table }: TableFilterOptionsProps<TData>) {
  const popoverId = useId();
  const activeFilterId = useTableActiveFilter(tableId);
  const storeColumnFilters = useTableColumnFilters(tableId);
  const setActiveFilter = useSetActiveFilterAction();
  const setColumnFilters = useSetColumnFiltersAction();
  const clearAllFilters = useClearAllFiltersAction();

  const columnFilters = useMemo(() => {
    const normalized = storeColumnFilters.filter((filter) => hasFilterValue(filter.value));
    const seen = new Set<string>();
    return normalized.filter((filter) => {
      const key = `${filter.id}:${JSON.stringify(filter.value)} `;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [storeColumnFilters]);

  const allColumns = table
    .getAllLeafColumns()
    .filter(
      (column) =>
        (!!column.columnDef.meta?.filterType || column.getCanFilter()) && !!column.columnDef.header,
    );

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Open table filters"
          aria-controls={popoverId}
          className="flex h-11 items-center gap-2 rounded-xl border border-linen-200 bg-surface px-4 py-2 text-sm font-medium text-ink-900 shadow-sm transition-all active:scale-[0.98] normal-case tracking-normal group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:border-teal-300 cursor-pointer hover:bg-linen-50 hover:text-teal-700"
        >
          <span>Filter</span>
          <Filter className="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 text-neutral-400 group-hover:text-teal-600" />
        </button>
      </Popover.Trigger>
      <FilterContent
        tableId={tableId}
        table={table}
        allColumns={allColumns}
        activeFilter={activeFilterId}
        columnFilters={columnFilters}
        rawColumnFilters={storeColumnFilters}
        setActiveFilter={(id) => setActiveFilter(tableId, id)}
        setColumnFilters={(filters) => setColumnFilters(tableId, filters)}
        clearAllFilters={() => clearAllFilters(tableId)}
        popoverId={popoverId}
      />
    </Popover.Root>
  );
}

// Separate component to access Popover context
function FilterContent<TData>({
  tableId,
  table,
  allColumns,
  activeFilter,
  columnFilters,
  rawColumnFilters,
  setActiveFilter,
  setColumnFilters,
  clearAllFilters,
  popoverId,
}: {
  tableId: string;
  table: Table<TData>;
  allColumns: Column<TData, unknown>[];
  activeFilter: string | null;
  columnFilters: ColumnFiltersState;
  rawColumnFilters: ColumnFiltersState;
  setActiveFilter: (filter: string | null) => void;
  setColumnFilters: (filters: ColumnFiltersState) => void;
  clearAllFilters: () => void;
  popoverId: string;
}) {
  const { setOpen } = usePopover();
  const clearDateFilterDraft = useClearDateFilterDraftAction();
  const CLOSE_SMOOTH_DELAY_MS = 140;
  const closeSmooth = () => {
    window.setTimeout(() => setOpen(false), CLOSE_SMOOTH_DELAY_MS);
  };

  const handleFilterChange = (columnId: string, source: "name" | "checkmark") => {
    const action = resolveFilterToggleAction(columnId, activeFilter, rawColumnFilters, source);

    if (action.type === "clear") {
      closeSmooth();
      window.setTimeout(() => {
        const column = table.getColumn(columnId);
        column?.setFilterValue(undefined);
        setColumnFilters(action.remainingFilters);
        clearDateFilterDraft(tableId, columnId);
        setActiveFilter(action.nextActiveFilter);
      }, CLOSE_SMOOTH_DELAY_MS);
      return;
    }

    if (action.type === "deactivate") {
      setActiveFilter(null);
    }

    if (action.type === "activate") {
      setActiveFilter(action.nextActiveFilter);
    }
    closeSmooth();
  };

  const resetToDefault = () => {
    table.setColumnFilters([]);
    clearAllFilters();
    setActiveFilter(null);
    closeSmooth();
  };

  return (
    <Popover.Content
      id={popoverId}
      className="w-57.5 p-0 overflow-hidden border border-linen-200 rounded-xl shadow-xl"
      align="end"
    >
      <div className="flex flex-col bg-surface/95 backdrop-blur-xl">
        {/* Columns List */}
        <div className="px-1.5 py-1.5">
          <div className="flex flex-col gap-px">
            {allColumns.map((column) => {
              const columnId = column.id;
              const isActive = activeFilter === columnId;
              const hasValue = columnFilters.some(
                (f) => f.id === columnId && hasFilterValue(f.value),
              );
              const isChecked = hasValue || isActive;
              const columnName = getColumnTitle(column, table);

              return (
                <div
                  key={columnId}
                  className="group flex items-center justify-between rounded-md px-2 py-2 text-[12px] select-none border border-transparent transition-colors hover:bg-linen-50 text-ink-900"
                >
                  <button
                    type="button"
                    onClick={() => handleFilterChange(columnId, "name")}
                    aria-pressed={isChecked}
                    aria-label={`Edit filter ${columnName} `}
                    className={cn(
                      "truncate transition-colors cursor-pointer text-left flex-1",
                      isActive
                        ? "text-teal-600 font-medium"
                        : "text-neutral-600 font-medium hover:text-teal-700",
                    )}
                  >
                    {columnName}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFilterChange(columnId, "checkmark")}
                    aria-pressed={isChecked}
                    aria-label={`${isChecked ? "Disable" : "Enable"} filter ${columnName} `}
                    className={cn(
                      "ml-2 flex items-center justify-center size-4 rounded border transition-all cursor-pointer shrink-0",
                      isChecked
                        ? "bg-teal-600 border-teal-600 text-surface shadow-sm"
                        : "border-linen-200 bg-surface text-transparent hover:border-teal-300 hover:bg-teal-50",
                    )}
                  >
                    <Check className="size-2.5" strokeWidth={3} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-linen-100 bg-linen-50/40">
          <button
            type="button"
            onClick={resetToDefault}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-[11px] font-medium text-teal-700 hover:text-teal-800 hover:bg-teal-50 transition-all active:scale-[0.98] cursor-pointer"
          >
            <RotateCcw className="size-3" />
            <span>Reset to Default</span>
          </button>
        </div>
      </div>
    </Popover.Content>
  );
}
