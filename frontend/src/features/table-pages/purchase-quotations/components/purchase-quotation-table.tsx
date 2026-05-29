import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useRouter } from "@tanstack/react-router";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { normalizeColumnFilters } from "@/components/types/filter-utils";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { mapSearchToPurchaseQuotationListParams } from "@/features/table-pages/purchase-quotations/api/purchase-quotation-query.mapper";
import { purchaseQuotationQueries } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.queries";
import type { PurchaseQuotationListItem } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.service";
import { createPurchaseQuotationColumns } from "@/features/table-pages/purchase-quotations/components/purchase-quotation-columns";
import { PurchaseQuotationLookupLayer } from "@/features/table-pages/purchase-quotations/components/purchase-quotation-lookup-layer";
import { purchaseQuotationColumnFilterSchema } from "@/features/table-pages/purchase-quotations/schemas/purchase-quotation-search.schema";
import type {
  PurchaseQuotationColumnFilter,
  PurchaseQuotationSearch,
} from "@/features/table-pages/purchase-quotations/schemas/purchase-quotation-search.schema";
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

const routeApi = getRouteApi("/_layout/purchase/quotations");
const TABLE_ID = "purchase-quotations";
const DEFAULT_COLUMN_ORDER = ["DocNum", "DocDate", "CardCode", "CardName", "DocTotal", "DocStatus"];
const EDIT_PRODUCTS_PREFETCH_LIMIT = 100;

const toPurchaseQuotationColumnFilters = (
  filters: ColumnFiltersState,
): PurchaseQuotationColumnFilter[] => {
  const typedFilters: PurchaseQuotationColumnFilter[] = [];
  for (const filter of filters) {
    const parsed = purchaseQuotationColumnFilterSchema.safeParse(filter);
    if (!parsed.success) {
      continue;
    }
    typedFilters.push(parsed.data);
  }
  return typedFilters;
};

// PurchaseQuotationTable: Comprehensive data grid for purchase quotations, utilizing TanStack Table for headless logic.
// Follows a strict URL-first state pattern to ensure reliability and searchability.
export function PurchaseQuotationTable() {
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
        .fetchQuery(purchaseQuotationQueries.detailByDocNum(normalizedDocNum))
        .then((response) => {
          void router.preloadRoute({
            params: { docNum: normalizedDocNum },
            to: "/purchase/quotations/$docNum/edit",
          } as never);
          void Promise.allSettled([
            queryClient.prefetchQuery(createSharedQueries.vendors()),
            queryClient.prefetchQuery(createSharedQueries.warehouses()),
            queryClient.prefetchQuery(createSharedQueries.salesEmployees()),
          ]);

          const detail = response?.data;
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
      createPurchaseQuotationColumns({
        onDocNumDoubleClick: (docNum) => {
          const normalized = String(docNum).trim();
          if (!normalized) {
            return;
          }
          prefetchEditRouteData(normalized);
          void navigate({
            params: { docNum: normalized },
            to: "/purchase/quotations/$docNum/edit",
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
    () => mapSearchToPurchaseQuotationListParams(searchParams),
    [searchParams],
  );

  const {
    data: purchaseQuotationList,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery(purchaseQuotationQueries.list(listParams));

  const rows = useMemo(() => purchaseQuotationList?.data ?? [], [purchaseQuotationList?.data]);
  const totalRows = purchaseQuotationList?.total ?? 0;
  const totalPages = Math.max(purchaseQuotationList?.totalPages ?? 1, 1);
  const showInitialSkeleton = isLoading && !purchaseQuotationList;

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table's useReactTable returns functions that cannot be memoized
  const table = useReactTable<PurchaseQuotationListItem>({
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
      const nextSearchColumnFilters = toPurchaseQuotationColumnFilters(nextFilters);
      navigate({
        replace: true,
        search: (prev: PurchaseQuotationSearch) => ({
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
        search: (prev: PurchaseQuotationSearch) => ({
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
        search: (prev: PurchaseQuotationSearch) => ({
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
        search: (prev: PurchaseQuotationSearch) => ({
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
        search: (prev: PurchaseQuotationSearch) => ({
          ...prev,
          sorting: nextSorting.length > 0 ? nextSorting : [],
        }),
      });
    },
    pageCount: totalPages,
    sortDescFirst: false,
    state: tableState,
  });

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
      search: (prev: PurchaseQuotationSearch) => ({
        ...prev,
        page: clampedPageIndex + 1,
      }),
    });
  }, [pagination.pageIndex, maxPageIndex, filteredTotalRows, setPagination, navigate]);

  const getQueryOptions = useCallback(
    (params: { page: number; limit: number }) =>
      purchaseQuotationQueries.list({ ...listParams, ...params }),
    [listParams],
  );

  const { prefetchPage } = useTablePrefetch({
    getQueryOptions,
    hasData: !!purchaseQuotationList,
    maxPageIndex,
    pagination,
    queryClient,
  });

  useTableToast({
    action: lastActionRef.current,
    hasData: !!purchaseQuotationList,
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
      search: (prev: PurchaseQuotationSearch) => ({
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
      queryClient.prefetchQuery(createSharedQueries.vendors()),
      queryClient.prefetchQuery(createSharedQueries.salesEmployees()),
    ]);
  }, [queryClient]);

  if (showInitialSkeleton) {
    return <TableSkeleton />;
  }

  if (isError && !purchaseQuotationList) {
    return (
      <TableErrorState
        title="Purchase quotations unavailable"
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-white flex flex-col">
      <PurchaseQuotationLookupLayer
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
