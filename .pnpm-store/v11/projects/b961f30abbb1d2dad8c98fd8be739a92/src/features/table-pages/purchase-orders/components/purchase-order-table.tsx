import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useRouter } from "@tanstack/react-router";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { normalizeColumnFilters } from "@/components/types/filter-utils";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { mapSearchToPurchaseOrderListParams } from "@/features/table-pages/purchase-orders/api/purchase-order-query.mapper";
import { purchaseOrderQueries } from "@/features/table-pages/purchase-orders/api/purchase-order.queries";
import type {
  PurchaseOrderDetail,
  PurchaseOrderListItem,
} from "@/features/table-pages/purchase-orders/api/purchase-order.service";
import { createPurchaseOrderColumns } from "@/features/table-pages/purchase-orders/components/purchase-order-columns";
import { PurchaseOrderLookupLayer } from "@/features/table-pages/purchase-orders/components/purchase-order-lookup-layer";
import { purchaseOrderColumnFilterSchema } from "@/features/table-pages/purchase-orders/schemas/purchase-order-search.schema";
import type {
  PurchaseOrderColumnFilter,
  PurchaseOrderSearch,
} from "@/features/table-pages/purchase-orders/schemas/purchase-order-search.schema";
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
import { useTablePrefetch } from "@/features/table-pages/table-shared/hooks/use-table-prefetch";
import { useTableToast } from "@/features/table-pages/table-shared/hooks/use-table-toast";
import type { TableFetchAction } from "@/features/table-pages/table-shared/hooks/use-table-toast";
import {
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

const routeApi = getRouteApi("/_layout/purchase/orders");
const TABLE_ID = "purchase-orders";
const DEFAULT_COLUMN_ORDER = ["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocStatus"];
const EDIT_PRODUCTS_PREFETCH_LIMIT = 100;

const toPurchaseOrderColumnFilters = (filters: ColumnFiltersState): PurchaseOrderColumnFilter[] => {
  const typedFilters: PurchaseOrderColumnFilter[] = [];
  for (const filter of filters) {
    const parsed = purchaseOrderColumnFilterSchema.safeParse(filter);
    if (!parsed.success) {
      continue;
    }
    typedFilters.push(parsed.data);
  }
  return typedFilters;
};

// PurchaseOrderTable: Orchestrates the primary listing view with server-side sorting, filtering, and pagination.
// State is mirrored in the URL via TanStack Router for shareable, persistent views.
export function PurchaseOrderTable() {
  const searchParams = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const router = useRouter();
  const setSorting = useSetSortingAction();
  const setVisibility = useSetVisibilityAction();
  const setOrder = useSetOrderAction();
  const setPagination = useSetPaginationAction();
  const setColumnFilters = useSetColumnFiltersAction();
  const clearAllFilters = useClearAllFiltersAction();
  const queryClient = useQueryClient();

  /** Tracks which user action last triggered a fetch for action-specific toasts. */
  const lastActionRef = useRef<TableFetchAction>("fetching");
  const docNumPrefetchRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    window.scrollTo({ behavior: "smooth", top: 0 });
  }, []);

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
        .fetchQuery(purchaseOrderQueries.detailByDocNum(normalizedDocNum))
        .then((response) => {
          const detail: PurchaseOrderDetail | undefined = response?.data;

          void router.preloadRoute({
            params: { docNum: normalizedDocNum },
            to: "/purchase/orders/$docNum/edit",
          } as never);
          void Promise.allSettled([
            queryClient.prefetchQuery(createSharedQueries.vendors()),
            queryClient.prefetchQuery(createSharedQueries.warehouses()),
            queryClient.prefetchQuery(createSharedQueries.salesEmployees()),
          ]);

          if (!detail) {
            return;
          }

          const warehouseCode = String(detail.DocumentLines?.[0]?.WarehouseCode ?? "").trim();
          if (warehouseCode) {
            void queryClient.prefetchQuery(
              createSharedQueries.products(warehouseCode, undefined, EDIT_PRODUCTS_PREFETCH_LIMIT),
            );
          }

          const itemCodes = [
            ...new Set(
              (detail.DocumentLines ?? [])
                .map((line) => String(line.ItemCode ?? "").trim())
                .filter(Boolean),
            ),
          ];

          for (const itemCode of itemCodes) {
            void queryClient.prefetchQuery(createSharedQueries.productWarehouseStocks(itemCode));
          }
        })
        .catch(() => {
          docNumPrefetchRef.current.delete(normalizedDocNum);
        });
    },
    [queryClient, router],
  );

  const columns = useMemo(
    () =>
      createPurchaseOrderColumns({
        onDocNumDoubleClick: (docNum) => {
          const normalized = String(docNum).trim();
          if (!normalized) {
            return;
          }
          prefetchEditRouteData(normalized);
          void navigate({
            params: { docNum: normalized },
            to: "/purchase/orders/$docNum/edit",
            viewTransition: true,
          } as never);
        },
        onDocNumHover: (docNum) => {
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
    const filtered = base.filter((id) => columnIds.includes(id));
    return cloneOrder(filtered.length ? filtered : DEFAULT_COLUMN_ORDER);
  }, [searchParams.columnOrder, columnIds]);

  const columnFilters = useMemo<ColumnFiltersState>(
    () => cloneFilters(normalizeColumnFilters(searchParams.columnFilters)),
    [searchParams.columnFilters],
  );

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

  const listParams = useMemo(
    () => mapSearchToPurchaseOrderListParams(searchParams),
    [searchParams],
  );

  // Data Fetching: Syncs with listParams derived directly from the URL search state.
  const {
    data: poList,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery(purchaseOrderQueries.list(listParams));

  const rows = useMemo(() => poList?.data ?? [], [poList?.data]);
  const totalRows = poList?.total ?? 0;
  const totalPages = Math.max(poList?.totalPages ?? 1, 1);
  const showInitialSkeleton = isLoading && !poList;

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<PurchaseOrderListItem>({
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
    onColumnFiltersChange: (updater) => {
      lastActionRef.current = "filtering";
      const next = typeof updater === "function" ? updater(columnFilters) : updater;
      const normalized = normalizeColumnFilters(next);
      const nextFilters = cloneFilters(normalized);
      setColumnFilters(TABLE_ID, nextFilters);
      setPagination(TABLE_ID, { pageIndex: 0 });
      const nextSearchColumnFilters = toPurchaseOrderColumnFilters(nextFilters);
      navigate({
        replace: true,
        search: (prev: PurchaseOrderSearch) => ({
          ...prev,
          page: 1,
          columnFilters: nextSearchColumnFilters,
          DocTotalOperator: undefined,
          DocTotal: undefined,
        }),
      });
    },
    onColumnOrderChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnOrder) : updater;
      setOrder(TABLE_ID, cloneOrder(next));
      navigate({
        replace: true,
        search: (prev: PurchaseOrderSearch) => ({
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
        search: (prev: PurchaseOrderSearch) => ({
          ...prev,
          columnVisibility: { ...nextVisibility },
        }),
      });
    },
    onPaginationChange: (updater) => {
      lastActionRef.current = "paginating";
      const next = typeof updater === "function" ? updater(pagination) : updater;
      const nextPagination = {
        pageIndex: Math.max(next.pageIndex, 0),
        pageSize: Math.max(next.pageSize, 1),
      };
      setPagination(TABLE_ID, nextPagination);
      navigate({
        replace: true,
        search: (prev: PurchaseOrderSearch) => ({
          ...prev,
          page: nextPagination.pageIndex + 1,
          limit: nextPagination.pageSize,
        }),
      });
    },
    onSortingChange: (updater) => {
      lastActionRef.current = "sorting";
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const nextSorting = cloneSorting(next);
      setSorting(TABLE_ID, nextSorting);
      navigate({
        replace: true,
        search: (prev: PurchaseOrderSearch) => ({
          ...prev,
          sorting: nextSorting.length > 0 ? nextSorting : [],
        }),
      });
    },
    pageCount: totalPages,
    sortDescFirst: false,
    state: tableState,
  });

  // Table Logic Summary: Syncs local UI state (sorting/visibility) back to the URL coordinates.
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
      search: (prev: PurchaseOrderSearch) => ({
        ...prev,
        page: clampedPageIndex + 1,
      }),
    });
  }, [pagination.pageIndex, maxPageIndex, filteredTotalRows, setPagination, navigate]);

  // Aggressive Background Prefetching (Shared Global Hook)
  const getQueryOptions = useCallback(
    (params: { page: number; limit: number }) =>
      purchaseOrderQueries.list({ ...listParams, ...params }),
    [listParams],
  );

  const { prefetchPage } = useTablePrefetch({
    getQueryOptions,
    hasData: !!poList,
    maxPageIndex,
    pagination,
    queryClient,
  });

  useTableToast({
    action: lastActionRef.current,
    hasData: !!poList,
    isFetching,
  });

  const handleResetTable = useCallback(() => {
    setSorting(TABLE_ID, []);
    setVisibility(TABLE_ID, {});
    setOrder(TABLE_ID, [...DEFAULT_COLUMN_ORDER]);
    clearAllFilters(TABLE_ID);
    setPagination(TABLE_ID, { pageIndex: 0, pageSize: 10, totalRows: 0 });

    navigate({
      replace: true,
      search: (prev: PurchaseOrderSearch) => ({
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

  if (isError && !poList) {
    return (
      <TableErrorState
        title="Purchase orders unavailable"
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-white flex flex-col">
      <PurchaseOrderLookupLayer
        tableId={TABLE_ID}
        table={table}
        onReset={handleResetTable}
        onCreateClick={handleCreateClickPrefetch}
      />

      <div className="flex-1 overflow-auto w-full px-1.5">
        <Table className="w-full min-w-300">
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
