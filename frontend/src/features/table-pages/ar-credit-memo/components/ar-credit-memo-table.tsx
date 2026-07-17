import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useRouter } from "@tanstack/react-router";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { normalizeColumnFilters } from "@/components/types/filter-utils";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { mapSearchToArCreditMemoListParams } from "@/features/table-pages/ar-credit-memo/api/ar-credit-memo-query.mapper";
import { arCreditMemoQueries } from "@/features/table-pages/ar-credit-memo/api/ar-credit-memo.queries";
import type { ArCreditMemoListItem } from "@/features/table-pages/ar-credit-memo/api/ar-credit-memo.service";
import { createArCreditMemoColumns } from "@/features/table-pages/ar-credit-memo/components/ar-credit-memo-columns";
import { ArCreditMemoLookupLayer } from "@/features/table-pages/ar-credit-memo/components/ar-credit-memo-lookup-layer";
import { ArCreditMemoColumnFilterSchema } from "@/features/table-pages/ar-credit-memo/schemas/ar-credit-memo-search.schema";
import type {
  ArCreditMemoColumnFilter,
  ArCreditMemoSearch,
} from "@/features/table-pages/ar-credit-memo/schemas/ar-credit-memo-search.schema";
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
import { useTablePrefetch } from "@/features/table-pages/table-shared/hooks/use-table-prefetch";import {
  cloneFilters,
  cloneOrder,
  cloneSorting,
  cloneVisibility,
  normalizeVisibility,
} from "@/features/table-pages/table-shared/utils/table-state.utils";
import { useSetColumnFiltersAction } from "@/store/table/table-filter.store";
import { useClearAllFiltersAction } from "@/store/table/table-filter.store";
import { useSetOrderAction } from "@/store/table/table-order.store";
import { useSetPaginationAction } from "@/store/table/table-pagination.store";
import { useSetSortingAction } from "@/store/table/table-sorting.store";
import { useSetVisibilityAction } from "@/store/table/table-visibility.store";

const routeApi = getRouteApi("/_layout/sales/ar-credit-memo");
const TABLE_ID = "ar-credit-memos";
const DEFAULT_COLUMN_ORDER = ["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocStatus"];

const toArCreditMemoColumnFilters = (filters: ColumnFiltersState): ArCreditMemoColumnFilter[] => {
  const typedFilters: ArCreditMemoColumnFilter[] = [];
  for (const filter of filters) {
    const parsed = ArCreditMemoColumnFilterSchema.safeParse(filter);
    if (!parsed.success) {
      continue;
    }
    typedFilters.push(parsed.data);
  }
  return typedFilters;
};

/**
 * ArCreditMemoTable: Accounts Receivable Credit Note data grid.
 * Mirrors the financial list pattern for strict visual and functional consistency.
 */
export function ArCreditMemoTable() {
  const searchParams = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const router = useRouter();
  const setSorting = useSetSortingAction();
  const setVisibility = useSetVisibilityAction();
  const setOrder = useSetOrderAction();
  const setPagination = useSetPaginationAction();
  const setColumnFilters = useSetColumnFiltersAction();
  const clearAllFilters = useClearAllFiltersAction();

  /** Tracks which user action last triggered a fetch for action-specific toasts. */  const docNumPrefetchRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    window.scrollTo({ behavior: "smooth", top: 0 });
  }, []);

  const queryClient = useQueryClient();

  const prefetchEditRouteData = useCallback(
    (docNum: string) => {
      const normalizedDocNum = docNum.trim();
      if (!normalizedDocNum) {
        return;
      }
      if (docNumPrefetchRef.current.has(normalizedDocNum)) {
        return;
      }
      docNumPrefetchRef.current.add(normalizedDocNum);

      void queryClient
        .fetchQuery(arCreditMemoQueries.detailByDocNum(normalizedDocNum))
        .then(() => {
          void router.preloadRoute({
            params: { docNum: normalizedDocNum },
            to: "/sales/ar-credit-memo/$docNum/update",
          } as never);
          void Promise.allSettled([
            queryClient.prefetchQuery(createSharedQueries.warehouses()),
            queryClient.prefetchQuery(createSharedQueries.salesEmployees()),
          ]);
        })
        .catch(() => {
          docNumPrefetchRef.current.delete(normalizedDocNum);
        });
    },
    [queryClient, router],
  );

  const columns = useMemo(
    () =>
      createArCreditMemoColumns({
        onDocNumDoubleClick: (docNum, draftDocEntry) => {
          const normalized = String(docNum).trim();
          if (!normalized) {
            return;
          }
          if (draftDocEntry) {
            void navigate({
              search: {
                draftDocNum: normalized,
                draftDocEntry: String(draftDocEntry),
              },
              to: "/sales/ar-credit-memo/create",
              viewTransition: true,
            } as never);
            return;
          }
          prefetchEditRouteData(normalized);
          void navigate({
            params: { docNum: normalized },
            to: "/sales/ar-credit-memo/$docNum/update",
            viewTransition: true,
          } as never);
        },
        onDocNumHover: (docNum, draftDocEntry) => {
          if (draftDocEntry) {
            return;
          }
          const normalized = String(docNum).trim();
          if (!normalized) {
            return;
          }
          prefetchEditRouteData(normalized);
        },
      }),
    [navigate, prefetchEditRouteData],
  );
  const columnIds = useMemo(
    () =>
      columns
        .map((column) =>
          column.id ? column.id : typeof column.accessorKey === "string" ? column.accessorKey : "",
        )
        .filter(Boolean),
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
    // Hydrate from direct query parameters
    const built: ColumnFiltersState = [];
    if (searchParams.CardCode) built.push({ id: "CardCode", value: searchParams.CardCode });
    if (searchParams.CardName) built.push({ id: "CardName", value: searchParams.CardName });
    if (searchParams.DocNum) built.push({ id: "DocNum", value: searchParams.DocNum });
    if (searchParams.DocStatus) built.push({ id: "DocStatus", value: searchParams.DocStatus });
    if (searchParams.DocDateStart || searchParams.DocDateEnd) {
      built.push({
        id: "DocDate",
        value: { from: searchParams.DocDateStart, to: searchParams.DocDateEnd },
      });
    }
    if (searchParams.DocTotal !== undefined && searchParams.DocTotalOperator) {
      built.push({
        id: "DocTotal",
        value: { operator: searchParams.DocTotalOperator, value: searchParams.DocTotal },
      });
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

  const listParams = useMemo(() => mapSearchToArCreditMemoListParams(searchParams), [searchParams]);

  // Query Integration: Centralized fetching logic syncs with URL-based search parameters.
  const {
    data: ArCreditMemoList,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(arCreditMemoQueries.list(listParams));

  const rows = useMemo(() => ArCreditMemoList?.data ?? [], [ArCreditMemoList?.data]);
  const totalRows = ArCreditMemoList?.total ?? 0;
  const totalPages = Math.max(ArCreditMemoList?.totalPages ?? 1, 1);
  const showInitialSkeleton = isLoading && !ArCreditMemoList;

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<ArCreditMemoListItem>({
    autoResetPageIndex: false,
    columns,
    data: rows,
    enableFilters: true,
    enableSorting: true,
    enableSortingRemoval: true,
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    meta: { tableId: TABLE_ID },
    onColumnFiltersChange: (updater) => {      const next = typeof updater === "function" ? updater(columnFilters) : updater;
      const normalized = normalizeColumnFilters(next);
      const nextFilters = cloneFilters(normalized);
      setColumnFilters(TABLE_ID, nextFilters);
      setPagination(TABLE_ID, { pageIndex: 0 });
      const nextSearchColumnFilters = toArCreditMemoColumnFilters(nextFilters);

      const docNumVal = nextFilters.find((f) => f.id === "DocNum")?.value;
      const cardCodeVal = nextFilters.find((f) => f.id === "CardCode")?.value;
      const cardNameVal = nextFilters.find((f) => f.id === "CardName")?.value;
      const docStatusVal = nextFilters.find((f) => f.id === "DocStatus")?.value;
      const docDateVal = nextFilters.find((f) => f.id === "DocDate")?.value as any;
      const docTotalVal = nextFilters.find((f) => f.id === "DocTotal")?.value as any;

      navigate({
        replace: true,
        search: (prev: ArCreditMemoSearch) => ({
          ...prev,
          page: 1,
          columnFilters: nextSearchColumnFilters,
          DocNum: docNumVal ? String(docNumVal) : undefined,
          CardCode: cardCodeVal ? String(cardCodeVal) : undefined,
          CardName: cardNameVal ? String(cardNameVal) : undefined,
          DocStatus: docStatusVal ? String(docStatusVal) : undefined,
          DocDateStart: docDateVal?.from ?? docDateVal?.to ?? undefined,
          DocDateEnd: docDateVal?.to ?? docDateVal?.from ?? undefined,
          DocTotalOperator: docTotalVal?.operator ?? undefined,
          DocTotal: docTotalVal?.value ?? undefined,
        }),
      });
    },
    onColumnOrderChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnOrder) : updater;
      setOrder(TABLE_ID, cloneOrder(next));
      navigate({
        replace: true,
        search: (prev: ArCreditMemoSearch) => ({
          ...prev,
          columnOrder: [...next],
        }),
      });
    },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnVisibility) : updater;
      const nextVisibility = normalizeVisibility(cloneVisibility(next));
      setVisibility(TABLE_ID, nextVisibility);
      navigate({
        replace: true,
        search: (prev: ArCreditMemoSearch) => ({
          ...prev,
          columnVisibility: { ...nextVisibility },
        }),
      });
    },
    onPaginationChange: (updater) => {      const next = typeof updater === "function" ? updater(pagination) : updater;
      const nextPagination = {
        pageIndex: Math.max(next.pageIndex, 0),
        pageSize: Math.max(next.pageSize, 1),
      };
      setPagination(TABLE_ID, nextPagination);
      navigate({
        replace: true,
        search: (prev: ArCreditMemoSearch) => ({
          ...prev,
          page: nextPagination.pageIndex + 1,
          limit: nextPagination.pageSize,
        }),
      });
    },
    onSortingChange: (updater) => {      const next = typeof updater === "function" ? updater(sorting) : updater;
      const nextSorting = cloneSorting(next);
      setSorting(TABLE_ID, nextSorting);
      navigate({
        replace: true,
        search: (prev: ArCreditMemoSearch) => ({
          ...prev,
          sorting: nextSorting.length > 0 ? nextSorting : [],
        }),
      });
    },
    pageCount: totalPages,
    sortDescFirst: false,
    state: tableState,
  });

  // Table Orchestration: Reconciles reactive query data with the TanStack Table instance.
  const filteredTotalRows = totalRows;
  const effectivePageSize = Math.max(pagination.pageSize, 1);
  const effectivePageCount = Math.max(
    totalPages,
    Math.ceil(filteredTotalRows / effectivePageSize),
    1,
  );
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
    navigate({
      replace: true,
      search: (prev: ArCreditMemoSearch) => ({
        ...prev,
        page: clampedPageIndex + 1,
      }),
    });
  }, [pagination.pageIndex, maxPageIndex, filteredTotalRows, setPagination, navigate]);

  // Aggressive Background Prefetching (Shared Global Hook)
  const getQueryOptions = useCallback(
    (params: { page: number; limit: number }) =>
      arCreditMemoQueries.list({ ...listParams, ...params }),
    [listParams],
  );

  const { prefetchPage } = useTablePrefetch({
    getQueryOptions,
    hasData: !!ArCreditMemoList,
    maxPageIndex,
    pagination,
    queryClient,
  });
  const handleResetTable = useCallback(() => {
    setSorting(TABLE_ID, []);
    setVisibility(TABLE_ID, {});
    setOrder(TABLE_ID, [...DEFAULT_COLUMN_ORDER]);
    clearAllFilters(TABLE_ID);
    setPagination(TABLE_ID, { pageIndex: 0, pageSize: 10, totalRows: 0 });

    navigate({
      replace: true,
      search: (prev: ArCreditMemoSearch) => ({
        ...prev,
        DocTotal: undefined,
        DocTotalOperator: undefined,
        columnFilters: [],
        columnOrder: [...DEFAULT_COLUMN_ORDER],
        columnVisibility: {},
        limit: 10,
        page: 1,
        sorting: [],
      }),
    });
  }, [setSorting, setVisibility, setOrder, clearAllFilters, setPagination, navigate]);

  const handleCreateClickPrefetch = useCallback(() => {
    void Promise.allSettled([
      queryClient.prefetchQuery(createSharedQueries.warehouses()),
      queryClient.prefetchQuery(createSharedQueries.salesEmployees()),
    ]);
  }, [queryClient]);

  if (showInitialSkeleton) {
    return <TableSkeleton />;
  }

  if (isError && !ArCreditMemoList) {
    return (
      <TableErrorState
        title="AR Credit Memos unavailable"
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-white flex flex-col">
      <ArCreditMemoLookupLayer
        tableId={TABLE_ID}
        table={table}
        onReset={handleResetTable}
        onCreateClick={handleCreateClickPrefetch}
      />

      <div className="flex-1 overflow-auto w-full px-1.5">
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="align-top py-3 whitespace-nowrap"
                    style={{ width: header.getSize() }}
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        tableId={TABLE_ID}
        table={table}
        totalRows={filteredTotalRows}
        onPrefetchPage={prefetchPage}
        onPrefetchPageSize={(pageSize) => prefetchPage(0, pageSize)}
      />
    </div>
  );
}
