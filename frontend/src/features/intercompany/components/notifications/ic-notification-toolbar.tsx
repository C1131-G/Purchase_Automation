import { Link } from "@tanstack/react-router";
import type { Table } from "@tanstack/react-table";
import { CheckCheck, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/button";
import { Separator } from "@/components/separator";
import type { IcNotification } from "@/features/intercompany/schemas/intercompany-api.schema";
import { TableViewOptions } from "@/features/table-pages/table-shared/components/controls/view-options";
import { TableFilterOptions } from "@/features/table-pages/table-shared/components/filters/filter-options";
import { TableSearch } from "@/features/table-pages/table-shared/components/filters/table-search";
import { hasFilterValue } from "@/components/types/filter-utils";
import { useSetActiveFilterAction, useTableActiveFilter } from "@/store/table/table-filter.store";

const EMPTY_SUGGESTIONS: never[] = [];

export interface IcNotificationToolbarProps {
  tableId: string;
  table: Table<IcNotification>;
  onReset: () => void;
  onMarkAllRead: () => void;
  markAllPending: boolean;
  unreadCount: number;
}

export function IcNotificationToolbar({
  tableId,
  table,
  onReset,
  onMarkAllRead,
  markAllPending,
  unreadCount,
}: IcNotificationToolbarProps) {
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

  const markAllDisabled = unreadCount === 0 || markAllPending;

  return (
    <div className="border-b border-zinc-100 bg-white">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <nav
          aria-label="Breadcrumb"
          className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-zinc-200/60 bg-zinc-50/50 px-3.5 py-1.5 text-xs font-medium text-zinc-600"
        >
          <span className="text-zinc-500">Intercompany</span>
          <ChevronRight className="size-3 shrink-0 text-zinc-300" aria-hidden />
          <Link
            to="/intercompany/notifications"
            search={{ isRead: "all", limit: 10, page: 1 }}
            preload="intent"
            viewTransition
            className="truncate font-semibold text-zinc-800 transition-colors hover:text-blue-600"
          >
            Notifications
          </Link>
          {unreadCount > 0 ? (
            <>
              <ChevronRight className="size-3 shrink-0 text-zinc-300" aria-hidden />
              <span className="tabular-nums text-blue-700" aria-live="polite">
                {unreadCount} unread
              </span>
            </>
          ) : null}
        </nav>

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
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-11 gap-2 normal-case tracking-normal"
            disabled={markAllDisabled}
            isLoading={markAllPending}
            loadingText="Marking…"
            aria-label={
              unreadCount > 0
                ? `Mark all ${unreadCount} notifications as read`
                : "No unread notifications"
            }
            onClick={onMarkAllRead}
          >
            <CheckCheck className="size-4" aria-hidden />
            Mark all read
          </Button>
        </div>
      </div>
    </div>
  );
}
