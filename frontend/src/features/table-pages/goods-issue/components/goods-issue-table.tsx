import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo } from "react";

import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { normalizeColumnFilters } from "@/components/types/filter-utils";
import { mapSearchToGoodsIssueListParams } from "@/features/table-pages/goods-issue/api/goods-issue-query.mapper";
import { goodsIssueQueries } from "@/features/table-pages/goods-issue/api/goods-issue.queries";
import type { GoodsIssueListItem } from "@/features/table-pages/goods-issue/api/goods-issue.service";
import { createGoodsIssueColumns } from "@/features/table-pages/goods-issue/components/goods-issue-columns";
import { GoodsIssueLookupLayer } from "@/features/table-pages/goods-issue/components/goods-issue-lookup-layer";
import type { GoodsIssueSearch } from "@/features/table-pages/goods-issue/schemas/goods-issue-search.schema";
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
import { useQueryClient } from "@tanstack/react-query";

const routeApi = getRouteApi("/_layout/inventory/goods-issue");
const TABLE_ID = "goodsIssue";
const DEFAULT_COLUMN_ORDER = ["DocNum", "DocDate", "TaxDate", "DocTotal", "DocStatus", "Comments"];

export function GoodsIssueTable() {
  const searchParams = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const setSorting = useSetSortingAction();
  const setVisibility = useSetVisibilityAction();
  const setOrder = useSetOrderAction();
  const setPagination = useSetPaginationAction();
  const setColumnFilters = useSetColumnFiltersAction();
  const clearAllFilters = useClearAllFiltersAction();
  const queryClient = useQueryClient();  useEffect(() => {
    window.scrollTo({ behavior: "smooth", top: 0 });
  }, []);

  const pagination = useMemo(
    () => ({
      pageIndex: Math.max((searchParams.page ?? 1) - 1, 0),
      pageSize: Math.max(searchParams.limit ?? 10, 1),
    }),
    [searchParams.page, searchParams.limit],
  );

  const columns = useMemo(
    () =>
      createGoodsIssueColumns({
        onDocNumDoubleClick: (docNum) => {
          void navigate({
            to: "/inventory/goods-issue/$docNum/update",
            params: { docNum: String(docNum) },
            search: {
              limit: pagination.pageSize,
              page: pagination.pageIndex + 1,
            },
          });
        },
      }),
    [navigate, pagination.pageIndex, pagination.pageSize],
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
    if (searchParams.DocNum) built.push({ id: "DocNum", value: searchParams.DocNum });
    if (searchParams.Comments) built.push({ id: "Comments", value: searchParams.Comments });
    if (searchParams.DocDateStart || searchParams.DocDateEnd) {
      built.push({
        id: "DocDate",
        value: { from: searchParams.DocDateStart, to: searchParams.DocDateEnd },
      });
    }
    if (searchParams.TaxDateStart || searchParams.TaxDateEnd) {
      built.push({
        id: "TaxDate",
        value: { from: searchParams.TaxDateStart, to: searchParams.TaxDateEnd },
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

  const listParams = useMemo(() => mapSearchToGoodsIssueListParams(searchParams), [searchParams]);

  const {
    data: giList,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(goodsIssueQueries.list(listParams));

  const rows = useMemo(() => giList?.data ?? [], [giList?.data]);
  const totalRows = giList?.total ?? 0;
  const totalPages = Math.max(giList?.totalPages ?? 1, 1);
  const showInitialSkeleton = isLoading && !giList;

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<GoodsIssueListItem>({
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
      const nextSearchFilters = nextFilters as any;

      const docNumVal = nextFilters.find((f) => f.id === "DocNum")?.value;
      const commentsVal = nextFilters.find((f) => f.id === "Comments")?.value;
      const docDateVal = nextFilters.find((f) => f.id === "DocDate")?.value as any;
      const taxDateVal = nextFilters.find((f) => f.id === "TaxDate")?.value as any;
      const docTotalVal = nextFilters.find((f) => f.id === "DocTotal")?.value as any;

      navigate({
        replace: true,
        search: (prev: GoodsIssueSearch) => ({
          ...prev,
          page: 1,
          columnFilters: nextSearchFilters,
          DocNum: docNumVal ? String(docNumVal) : undefined,
          Comments: commentsVal ? String(commentsVal) : undefined,
          DocDateStart: docDateVal?.from ?? docDateVal?.to ?? undefined,
          DocDateEnd: docDateVal?.to ?? docDateVal?.from ?? undefined,
          TaxDateStart: taxDateVal?.from ?? taxDateVal?.to ?? undefined,
          TaxDateEnd: taxDateVal?.to ?? taxDateVal?.from ?? undefined,
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
        search: (prev: GoodsIssueSearch) => ({ ...prev, columnOrder: [...next] }),
      });
    },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnVisibility) : updater;
      const nextVisibility = normalizeVisibility(cloneVisibility(next));
      setVisibility(TABLE_ID, nextVisibility);
      navigate({
        replace: true,
        search: (prev: GoodsIssueSearch) => ({
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
        search: (prev: GoodsIssueSearch) => ({
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
        search: (prev: GoodsIssueSearch) => ({
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
      search: (prev: GoodsIssueSearch) => ({ ...prev, page: clampedPageIndex + 1 }),
    });
  }, [pagination.pageIndex, maxPageIndex, filteredTotalRows, setPagination, navigate]);

  const getQueryOptions = useCallback(
    (params: { page: number; limit: number }) =>
      goodsIssueQueries.list({ ...listParams, ...params }),
    [listParams],
  );

  const { prefetchPage } = useTablePrefetch({
    getQueryOptions,
    hasData: !!giList,
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
      search: (prev: GoodsIssueSearch) => ({
        ...prev,
        columnFilters: [],
        columnOrder: [...DEFAULT_COLUMN_ORDER],
        columnVisibility: {},
        limit: 10,
        page: 1,
        sorting: [],
      }),
    });
  }, [setSorting, setVisibility, setOrder, clearAllFilters, setPagination, navigate]);

  if (showInitialSkeleton) {
    return <TableSkeleton />;
  }

  if (isError && !giList) {
    return (
      <TableErrorState
        title="Goods Issues unavailable"
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-white flex flex-col">
      <GoodsIssueLookupLayer tableId={TABLE_ID} table={table} onReset={handleResetTable} />

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
