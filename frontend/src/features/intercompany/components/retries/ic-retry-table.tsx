import { getRouteApi } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { normalizeColumnFilters } from "@/components/types/filter-utils";
import { useRunIcRetry } from "@/features/intercompany/api/intercompany.mutations";
import { useIcRetries } from "@/features/intercompany/api/intercompany.queries";
import {
  createIcRetryColumns,
  IC_RETRY_DEFAULT_COLUMN_ORDER,
} from "@/features/intercompany/components/retries/ic-retry-columns";
import { IcRetryToolbar } from "@/features/intercompany/components/retries/ic-retry-toolbar";
import type { IcRetryQueueItem } from "@/features/intercompany/schemas/intercompany-api.schema";
import {
  icRetryColumnFilterSchema,
  type IcRetryColumnFilter,
  type IcRetrySearch,
} from "@/features/intercompany/schemas/ic-retry-search.schema";
import { TablePagination } from "@/features/table-pages/table-shared/components/controls/pagination";
import { TableErrorState } from "@/features/table-pages/table-shared/components/core/table-error-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/features/table-pages/table-shared/components/core/table-root";
import {
  cloneFilters,
  cloneOrder,
  cloneSorting,
  cloneVisibility,
  normalizeVisibility,
} from "@/features/table-pages/table-shared/utils/table-state.utils";
import { toast } from "@/shared/ui/toast/toast";
import { toSafeErrorMessage } from "@/shared/utils/error-message";
import {
  useClearAllFiltersAction,
  useSetColumnFiltersAction,
} from "@/store/table/table-filter.store";
import { useSetOrderAction } from "@/store/table/table-order.store";
import { useSetPaginationAction } from "@/store/table/table-pagination.store";
import { useSetSortingAction } from "@/store/table/table-sorting.store";
import { useSetVisibilityAction } from "@/store/table/table-visibility.store";

const routeApi = getRouteApi("/_layout/intercompany/retries");
const TABLE_ID = "ic-retries";
const DEFAULT_COLUMN_ORDER = [...IC_RETRY_DEFAULT_COLUMN_ORDER];

const toIcRetryColumnFilters = (filters: ColumnFiltersState): IcRetryColumnFilter[] => {
  const typedFilters: IcRetryColumnFilter[] = [];
  for (const filter of filters) {
    const parsed = icRetryColumnFilterSchema.safeParse(filter);
    if (!parsed.success) {
      continue;
    }
    typedFilters.push(parsed.data);
  }
  return typedFilters;
};

const filterValueToString = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return String(value);
};

const isActionableStatus = (status: string): boolean => {
  const normalized = status.trim().toUpperCase();
  return normalized === "WAITING" || normalized === "DEAD";
};

/**
 * Session-company IC retry queue grid with force-run.
 * URL-first chrome; filter/sort/page are client-side over the list API.
 */
export function IcRetryTable() {
  const searchParams = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const setSorting = useSetSortingAction();
  const setVisibility = useSetVisibilityAction();
  const setOrder = useSetOrderAction();
  const setPagination = useSetPaginationAction();
  const setColumnFilters = useSetColumnFiltersAction();
  const clearAllFilters = useClearAllFiltersAction();

  const [runPendingId, setRunPendingId] = useState<number | null>(null);

  const listQuery = useIcRetries({});
  const runMutation = useRunIcRetry();

  useEffect(() => {
    window.scrollTo({ behavior: "smooth", top: 0 });
  }, []);

  const handleRun = useCallback(
    (retryId: number) => {
      setRunPendingId(retryId);
      runMutation.mutate(retryId, {
        onError: (error) => {
          toast.error("Could not run retry", {
            description: toSafeErrorMessage(
              error instanceof Error ? error.message : undefined,
              "Try again in a moment.",
            ),
          });
        },
        onSettled: () => {
          setRunPendingId(null);
        },
        onSuccess: (response) => {
          const result = response.data;
          if (result.status === "success") {
            toast.success(`Retry #${retryId} succeeded`);
            return;
          }
          if (result.status === "dead") {
            toast.error(`Retry #${retryId} marked dead`, {
              description: toSafeErrorMessage(result.errorMessage, "Max attempts reached."),
            });
            return;
          }
          toast.error(`Retry #${retryId} failed`, {
            description: toSafeErrorMessage(result.errorMessage, "Will wait for next attempt."),
          });
        },
      });
    },
    [runMutation],
  );

  const columns = useMemo(
    () =>
      createIcRetryColumns({
        onRun: handleRun,
        runPendingId,
      }),
    [handleRun, runPendingId],
  );

  const columnIds = useMemo(
    () => columns.map((column) => column.id ?? "").filter(Boolean),
    [columns],
  );

  const sorting = useMemo<SortingState>(
    () => cloneSorting(searchParams.sorting ?? []),
    [searchParams.sorting],
  );

  const columnVisibility = useMemo<VisibilityState>(
    () => cloneVisibility(searchParams.columnVisibility ?? {}),
    [searchParams.columnVisibility],
  );

  const columnOrder = useMemo<string[]>(() => {
    const base =
      searchParams.columnOrder?.length && searchParams.columnOrder.some(Boolean)
        ? searchParams.columnOrder
        : DEFAULT_COLUMN_ORDER;
    const filtered = base.filter((id: string) => columnIds.includes(id));
    return cloneOrder(filtered.length ? filtered : DEFAULT_COLUMN_ORDER);
  }, [searchParams.columnOrder, columnIds]);

  const columnFilters = useMemo<ColumnFiltersState>(() => {
    if (searchParams.columnFilters !== undefined) {
      return cloneFilters(normalizeColumnFilters(searchParams.columnFilters));
    }
    const built: ColumnFiltersState = [];
    if (searchParams.status && searchParams.status !== "all") {
      built.push({ id: "status", value: searchParams.status });
    }
    if (searchParams.q) {
      built.push({ id: "errorMessage", value: searchParams.q });
    }
    return cloneFilters(built);
  }, [searchParams]);

  const pagination = useMemo(
    () => ({
      pageIndex: Math.max((searchParams.page ?? 1) - 1, 0),
      pageSize: Math.max(searchParams.limit ?? 10, 1),
    }),
    [searchParams.page, searchParams.limit],
  );

  const tableState = useMemo(
    () => ({
      columnFilters,
      columnOrder,
      columnVisibility,
      pagination,
      sorting,
    }),
    [sorting, columnVisibility, columnOrder, pagination, columnFilters],
  );

  const rows = useMemo(() => listQuery.data?.data ?? [], [listQuery.data?.data]);
  const showInitialSkeleton = listQuery.isLoading && !listQuery.data;

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns non-memoizable functions
  const table = useReactTable<IcRetryQueueItem>({
    autoResetPageIndex: false,
    columns,
    data: rows,
    enableFilters: true,
    enableSorting: true,
    enableSortingRemoval: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta: { tableId: TABLE_ID },
    onColumnFiltersChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnFilters) : updater;
      const normalized = normalizeColumnFilters(next);
      const nextFilters = cloneFilters(normalized);
      setColumnFilters(TABLE_ID, nextFilters);
      setPagination(TABLE_ID, { pageIndex: 0 });
      const nextSearchColumnFilters = toIcRetryColumnFilters(nextFilters);

      const statusVal = filterValueToString(nextFilters.find((f) => f.id === "status")?.value);
      const errorVal = filterValueToString(nextFilters.find((f) => f.id === "errorMessage")?.value);

      const statusEnum =
        statusVal === "WAITING" ||
        statusVal === "PROCESSING" ||
        statusVal === "SUCCESS" ||
        statusVal === "DEAD" ||
        statusVal === "all"
          ? statusVal
          : "all";

      void navigate({
        replace: true,
        search: (prev: IcRetrySearch) => ({
          ...prev,
          actionCode: undefined,
          columnFilters: nextSearchColumnFilters,
          page: 1,
          q: errorVal,
          status: statusEnum,
        }),
      });
    },
    onColumnOrderChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnOrder) : updater;
      setOrder(TABLE_ID, cloneOrder(next));
      void navigate({
        replace: true,
        search: (prev: IcRetrySearch) => ({
          ...prev,
          columnOrder: [...next],
        }),
      });
    },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnVisibility) : updater;
      const nextVisibility = normalizeVisibility(cloneVisibility(next));
      setVisibility(TABLE_ID, nextVisibility);
      void navigate({
        replace: true,
        search: (prev: IcRetrySearch) => ({
          ...prev,
          columnVisibility: { ...nextVisibility },
        }),
      });
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      const nextPagination = {
        pageIndex: Math.max(next.pageIndex, 0),
        pageSize: Math.max(next.pageSize, 1),
      };
      setPagination(TABLE_ID, nextPagination);
      void navigate({
        replace: true,
        search: (prev: IcRetrySearch) => ({
          ...prev,
          limit: nextPagination.pageSize,
          page: nextPagination.pageIndex + 1,
        }),
      });
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const nextSorting = cloneSorting(next);
      setSorting(TABLE_ID, nextSorting);
      void navigate({
        replace: true,
        search: (prev: IcRetrySearch) => ({
          ...prev,
          sorting: nextSorting.length > 0 ? nextSorting : [],
        }),
      });
    },
    sortDescFirst: false,
    state: tableState,
  });

  const filteredTotalRows = table.getFilteredRowModel().rows.length;
  const actionableCount = useMemo(
    () => rows.filter((row) => isActionableStatus(String(row.status))).length,
    [rows],
  );
  const effectivePageSize = Math.max(pagination.pageSize, 1);
  const effectivePageCount = Math.max(Math.ceil(filteredTotalRows / effectivePageSize), 1);
  const maxPageIndex = Math.max(effectivePageCount - 1, 0);

  useEffect(() => {
    setColumnFilters(TABLE_ID, columnFilters);
  }, [setColumnFilters, columnFilters]);

  useEffect(() => {
    setPagination(TABLE_ID, {
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
      totalRows: filteredTotalRows,
    });
  }, [setPagination, pagination.pageIndex, pagination.pageSize, filteredTotalRows]);

  useEffect(() => {
    if (pagination.pageIndex <= maxPageIndex) {
      return;
    }
    const clampedPageIndex = maxPageIndex;
    setPagination(TABLE_ID, {
      pageIndex: clampedPageIndex,
      totalRows: filteredTotalRows,
    });
    void navigate({
      replace: true,
      search: (prev: IcRetrySearch) => ({
        ...prev,
        page: clampedPageIndex + 1,
      }),
    });
  }, [pagination.pageIndex, maxPageIndex, filteredTotalRows, setPagination, navigate]);

  const handleResetTable = useCallback(() => {
    setSorting(TABLE_ID, []);
    setVisibility(TABLE_ID, {});
    setOrder(TABLE_ID, [...DEFAULT_COLUMN_ORDER]);
    clearAllFilters(TABLE_ID);
    setPagination(TABLE_ID, { pageIndex: 0, pageSize: 10, totalRows: 0 });

    void navigate({
      replace: true,
      search: () => ({
        actionCode: undefined,
        columnFilters: [],
        columnOrder: [...DEFAULT_COLUMN_ORDER],
        columnVisibility: {},
        limit: 10,
        page: 1,
        q: undefined,
        sorting: [],
        status: "all",
      }),
    });
  }, [setSorting, setVisibility, setOrder, clearAllFilters, setPagination, navigate]);

  if (showInitialSkeleton) {
    return <TableSkeleton />;
  }

  if (listQuery.isError && !listQuery.data) {
    return (
      <TableErrorState
        title="Retry queue unavailable"
        message={
          listQuery.error instanceof Error ? toSafeErrorMessage(listQuery.error.message) : undefined
        }
        onRetry={() => {
          void listQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface">
      <IcRetryToolbar
        tableId={TABLE_ID}
        table={table}
        onReset={handleResetTable}
        actionableCount={actionableCount}
      />

      <div className="w-full flex-1 overflow-auto px-1.5">
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="align-top whitespace-nowrap py-3"
                    style={{ width: `${header.getSize()}%` }}
                  >
                    <div className="flex items-center justify-start gap-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => {
                const status = String(row.original.status).toUpperCase();
                const rowClass =
                  status === "DEAD"
                    ? "bg-red-50/40"
                    : status === "WAITING"
                      ? "bg-amber-50/30"
                      : undefined;
                return (
                  <TableRow key={row.id} className={rowClass} data-status={status}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="align-top"
                        style={{ width: `${cell.column.getSize()}%` }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-28 text-center"
                >
                  <div className="mx-auto max-w-sm space-y-1 py-4">
                    <p className="text-sm font-semibold text-ink-900">No retries match</p>
                    <p className="text-sm text-neutral-500">
                      Clear filters or wait for failed intercompany posts for this company.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination tableId={TABLE_ID} table={table} totalRows={filteredTotalRows} />
    </div>
  );
}
