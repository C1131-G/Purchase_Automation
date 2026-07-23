import type { Table } from "@tanstack/react-table";
import { useEffect, useMemo, useRef } from "react";

import { Separator } from "@/components/separator";
import { IcSectionNav } from "@/features/intercompany/components/ic-section-nav";
import type { IcRetryQueueItem } from "@/features/intercompany/schemas/intercompany-api.schema";
import { TableViewOptions } from "@/features/table-pages/table-shared/components/controls/view-options";
import { TableFilterOptions } from "@/features/table-pages/table-shared/components/filters/filter-options";
import { TableSearch } from "@/features/table-pages/table-shared/components/filters/table-search";
import { hasFilterValue } from "@/components/types/filter-utils";
import { useSetActiveFilterAction, useTableActiveFilter } from "@/store/table/table-filter.store";

const EMPTY_SUGGESTIONS: never[] = [];

export interface IcRetryToolbarProps {
  tableId: string;
  table: Table<IcRetryQueueItem>;
  onReset: () => void;
  actionableCount: number;
}

export function IcRetryToolbar({ tableId, table, onReset, actionableCount }: IcRetryToolbarProps) {
  const activeFilterId = useTableActiveFilter(tableId);
  const setActiveFilter = useSetActiveFilterAction();
  const hasRestoredInitialFilter = useRef(false);
  const tableColumnFilters = table.getState().columnFilters;
  const filterableColumnIds = useMemo(
    () =>
      table
        .getAllLeafColumns()
        .filter((column) => column.getCanFilter())
        .map((column) => column.id),
    [table],
  );
  const lastAppliedFilterId = useMemo(() => {
    const applied = tableColumnFilters.filter(
      (filter) => filterableColumnIds.includes(filter.id) && hasFilterValue(filter.value),
    );
    const last = applied.at(-1);
    return last?.id ?? null;
  }, [tableColumnFilters, filterableColumnIds]);

  useEffect(() => {
    if (hasRestoredInitialFilter.current) {
      return;
    }
    if (activeFilterId) {
      hasRestoredInitialFilter.current = true;
      return;
    }
    if (lastAppliedFilterId) {
      setActiveFilter(tableId, lastAppliedFilterId);
    }
    hasRestoredInitialFilter.current = true;
  }, [tableId, activeFilterId, lastAppliedFilterId, setActiveFilter]);

  useEffect(() => {
    if (!activeFilterId) {
      return;
    }
    if (!filterableColumnIds.includes(activeFilterId)) {
      setActiveFilter(tableId, null);
    }
  }, [tableId, activeFilterId, filterableColumnIds, setActiveFilter]);

  return (
    <div className="border-b border-zinc-100 bg-white">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <IcSectionNav
          active="retries"
          trailing={
            actionableCount > 0 ? (
              <span className="tabular-nums text-amber-800" aria-live="polite">
                {actionableCount} runnable
              </span>
            ) : null
          }
        />

        <div className="flex flex-1 items-center justify-end gap-2 pl-2">
          <div className="w-[min(320px,100%)] shrink-0">
            <TableSearch
              className="w-full"
              table={table}
              activeFilterId={activeFilterId}
              suggestions={EMPTY_SUGGESTIONS}
              docNumSuggestions={EMPTY_SUGGESTIONS}
            />
          </div>

          <TableFilterOptions tableId={tableId} table={table} />
          <Separator orientation="vertical" className="mx-1 h-6" />
          <TableViewOptions tableId={tableId} table={table} onReset={onReset} />
        </div>
      </div>
    </div>
  );
}
