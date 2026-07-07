import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { normalizeColumnFilters } from "@/components/types/filter-utils";
import { mapSearchToItemMasterListParams } from "@/features/table-pages/item-master/api/item-master-query.mapper";
import { itemMasterQueries } from "@/features/table-pages/item-master/api/item-master.queries";
import type { ItemMasterListItem } from "@/features/table-pages/item-master/api/item-master.service";
import { createItemMasterColumns } from "@/features/table-pages/item-master/components/item-master-columns";
import { ItemMasterLookupLayer } from "@/features/table-pages/item-master/components/item-master-lookup-layer";
import type { ItemMasterSearch } from "@/features/table-pages/item-master/schemas/item-master-search.schema";
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
import { useQueryClient } from "@tanstack/react-query";

const routeApi = getRouteApi("/_layout/inventory/item-master");
const TABLE_ID = "itemMaster";
const DEFAULT_COLUMN_ORDER = [
  "ItemCode",
  "ItemName",
  "InvntItem",
  "ItmsGrpCod",
  "InvntryUom",
  "CodeBars",
];

export function ItemMasterTable() {
  const searchParams = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const setSorting = useSetSortingAction();
  const setVisibility = useSetVisibilityAction();
  const setOrder = useSetOrderAction();
  const setPagination = useSetPaginationAction();
  const setColumnFilters = useSetColumnFiltersAction();
  const clearAllFilters = useClearAllFiltersAction();
  const queryClient = useQueryClient();

  const lastActionRef = useRef<TableFetchAction>("fetching");

  useEffect(() => {
    window.scrollTo({ behavior: "smooth", top: 0 });
  }, []);

  const columns = useMemo(() => createItemMasterColumns(), []);
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

  const columnFilters = useMemo<ColumnFiltersState>(() => {
    if (searchParams.columnFilters !== undefined) {
      return cloneFilters(normalizeColumnFilters(searchParams.columnFilters));
    }
    // Hydrate from direct query parameters
    const built: ColumnFiltersState = [];
    if (searchParams.ItemCode) built.push({ id: "ItemCode", value: searchParams.ItemCode });
    if (searchParams.ItemName) built.push({ id: "ItemName", value: searchParams.ItemName });
    if (searchParams.frozenFor) built.push({ id: "frozenFor", value: searchParams.frozenFor });
    if (searchParams.validFor) built.push({ id: "validFor", value: searchParams.validFor });
    if (searchParams.ItmsGrpCod !== undefined)
      built.push({ id: "ItmsGrpCod", value: searchParams.ItmsGrpCod });
    if (searchParams.InvntryUom) built.push({ id: "InvntryUom", value: searchParams.InvntryUom });
    if (searchParams.CodeBars) built.push({ id: "CodeBars", value: searchParams.CodeBars });
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

  const listParams = useMemo(() => mapSearchToItemMasterListParams(searchParams), [searchParams]);

  const {
    data: itemsList,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery(itemMasterQueries.list(listParams));

  const rows = useMemo(() => itemsList?.data ?? [], [itemsList?.data]);
  const totalRows = itemsList?.total ?? 0;
  const totalPages = Math.max(itemsList?.totalPages ?? 1, 1);
  const showInitialSkeleton = isLoading && !itemsList;

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<ItemMasterListItem>({
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

      const itemCodeVal = nextFilters.find((f) => f.id === "ItemCode")?.value;
      const itemNameVal = nextFilters.find((f) => f.id === "ItemName")?.value;
      const frozenForVal = nextFilters.find((f) => f.id === "frozenFor")?.value;
      const validForVal = nextFilters.find((f) => f.id === "validFor")?.value;
      const itmsGrpCodVal = nextFilters.find((f) => f.id === "ItmsGrpCod")?.value;
      const invntryUomVal = nextFilters.find((f) => f.id === "InvntryUom")?.value;
      const codeBarsVal = nextFilters.find((f) => f.id === "CodeBars")?.value;

      navigate({
        replace: true,
        search: (prev: ItemMasterSearch) => ({
          ...prev,
          page: 1,
          columnFilters: nextFilters as any,
          ItemCode: itemCodeVal ? String(itemCodeVal) : undefined,
          ItemName: itemNameVal ? String(itemNameVal) : undefined,
          frozenFor: frozenForVal ? String(frozenForVal) : undefined,
          validFor: validForVal ? String(validForVal) : undefined,
          ItmsGrpCod:
            itmsGrpCodVal !== undefined && itmsGrpCodVal !== null && itmsGrpCodVal !== ""
              ? Number(itmsGrpCodVal)
              : undefined,
          InvntryUom: invntryUomVal ? String(invntryUomVal) : undefined,
          CodeBars: codeBarsVal ? String(codeBarsVal) : undefined,
        }),
      });
    },
    onColumnOrderChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnOrder) : updater;
      setOrder(TABLE_ID, cloneOrder(next));
      navigate({
        replace: true,
        search: (prev: ItemMasterSearch) => ({ ...prev, columnOrder: [...next] }),
      });
    },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnVisibility) : updater;
      const nextVisibility = normalizeVisibility(cloneVisibility(next));
      setVisibility(TABLE_ID, nextVisibility);
      navigate({
        replace: true,
        search: (prev: ItemMasterSearch) => ({
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
        search: (prev: ItemMasterSearch) => ({
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
        search: (prev: ItemMasterSearch) => ({
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
      search: (prev: ItemMasterSearch) => ({ ...prev, page: clampedPageIndex + 1 }),
    });
  }, [pagination.pageIndex, maxPageIndex, filteredTotalRows, setPagination, navigate]);

  const getQueryOptions = useCallback(
    (params: { page: number; limit: number }) =>
      itemMasterQueries.list({ ...listParams, ...params }),
    [listParams],
  );

  const { prefetchPage } = useTablePrefetch({
    getQueryOptions,
    hasData: !!itemsList,
    maxPageIndex,
    pagination,
    queryClient,
  });

  useTableToast({
    action: lastActionRef.current,
    hasData: !!itemsList,
    isFetching,
    onSettled: () => {
      lastActionRef.current = "fetching";
    },
  });

  const handleResetTable = useCallback(() => {
    setSorting(TABLE_ID, []);
    setVisibility(TABLE_ID, {});
    setOrder(TABLE_ID, [...DEFAULT_COLUMN_ORDER]);
    clearAllFilters(TABLE_ID);
    setPagination(TABLE_ID, { pageIndex: 0, pageSize: 10, totalRows: 0 });

    navigate({
      replace: true,
      search: (prev: ItemMasterSearch) => ({
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

  if (isError && !itemsList) {
    return (
      <TableErrorState
        title="Items unavailable"
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-white flex flex-col">
      <ItemMasterLookupLayer tableId={TABLE_ID} table={table} onReset={handleResetTable} />

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
