/**
 * RFQ data table — same layout as PurchaseQuotationTable (toolbar, grid, pagination).
 * Data: IC RFQ headers via GET /api/v1/ic/rfqs; filter/sort/page are client-side.
 * No Create — open existing RFQ by Doc Number (Phase 2 form).
 */
import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useRouter } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { TableSkeleton } from "@/components/skeleton/Table-skeleton";
import { normalizeColumnFilters } from "@/components/types/filter-utils";
import { icRfqQueries, useIcRfqs } from "@/features/intercompany/api/intercompany.queries";
import type { IcRfqHeader } from "@/features/intercompany/schemas/intercompany-api.schema";
import {
  createRfqColumns,
  RFQ_DEFAULT_COLUMN_ORDER,
} from "@/features/table-pages/rfqs/components/rfq-columns";
import { RfqLookupLayer } from "@/features/table-pages/rfqs/components/rfq-lookup-layer";
import { rfqColumnFilterSchema } from "@/features/table-pages/rfqs/schemas/rfq-search.schema";
import type {
  RfqColumnFilter,
  RfqSearch,
} from "@/features/table-pages/rfqs/schemas/rfq-search.schema";
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
import { toSafeErrorMessage } from "@/shared/utils/error-message";
import {
  useClearAllFiltersAction,
  useSetColumnFiltersAction,
} from "@/store/table/table-filter.store";
import { useSetOrderAction } from "@/store/table/table-order.store";
import { useSetPaginationAction } from "@/store/table/table-pagination.store";
import { useSetSortingAction } from "@/store/table/table-sorting.store";
import { useSetVisibilityAction } from "@/store/table/table-visibility.store";

const routeApi = getRouteApi("/_layout/sales/rfqs");
const TABLE_ID = "ic-rfqs";
const DEFAULT_COLUMN_ORDER = [...RFQ_DEFAULT_COLUMN_ORDER];

const toRfqColumnFilters = (filters: ColumnFiltersState): RfqColumnFilter[] => {
  const typedFilters: RfqColumnFilter[] = [];
  for (const filter of filters) {
    const parsed = rfqColumnFilterSchema.safeParse(filter);
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

export function RfqTable() {
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
  const detailPrefetchRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    window.scrollTo({ behavior: "smooth", top: 0 });
  }, []);

  const prefetchDetail = useCallback(
    (rfq: IcRfqHeader) => {
      if (!rfq.rfqId || detailPrefetchRef.current.has(rfq.rfqId)) {
        return;
      }
      detailPrefetchRef.current.add(rfq.rfqId);
      void queryClient.prefetchQuery(icRfqQueries.detail(rfq.rfqId)).catch(() => {
        detailPrefetchRef.current.delete(rfq.rfqId);
      });
      void router.preloadRoute({
        params: { rfqId: String(rfq.rfqId) },
        to: "/sales/rfqs/$rfqId",
      } as never);
    },
    [queryClient, router],
  );

  const columns = useMemo(
    () =>
      createRfqColumns({
        onDocNumDoubleClick: (rfq) => {
          if (!rfq.rfqId) {
            return;
          }
          prefetchDetail(rfq);
          void navigate({
            params: { rfqId: String(rfq.rfqId) },
            to: "/sales/rfqs/$rfqId",
            viewTransition: true,
          } as never);
        },
        onDocNumHover: (rfq) => {
          prefetchDetail(rfq);
        },
      }),
    [navigate, prefetchDetail],
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
    const built: ColumnFiltersState = [];
    if (searchParams.DocNum) {
      built.push({ id: "DocNum", value: searchParams.DocNum });
    }
    if (searchParams.CardCode) {
      built.push({ id: "CardCode", value: searchParams.CardCode });
    }
    if (searchParams.DocStatus) {
      built.push({ id: "DocStatus", value: searchParams.DocStatus });
    }
    if (searchParams.pqDraftDocNum) {
      built.push({ id: "pqDraftDocNum", value: searchParams.pqDraftDocNum });
    }
    if (searchParams.pqDraftDocEntry) {
      built.push({ id: "pqDraftDocEntry", value: searchParams.pqDraftDocEntry });
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

  const listQuery = useIcRfqs();
  const rows = useMemo(() => listQuery.data?.data ?? [], [listQuery.data?.data]);
  const showInitialSkeleton = listQuery.isLoading && !listQuery.data;

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns non-memoizable functions
  const table = useReactTable<IcRfqHeader>({
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
      const nextSearchColumnFilters = toRfqColumnFilters(nextFilters);

      void navigate({
        replace: true,
        search: (prev: RfqSearch) => ({
          ...prev,
          CardCode: filterValueToString(nextFilters.find((f) => f.id === "CardCode")?.value),
          DocNum: filterValueToString(nextFilters.find((f) => f.id === "DocNum")?.value),
          DocStatus: filterValueToString(nextFilters.find((f) => f.id === "DocStatus")?.value),
          columnFilters: nextSearchColumnFilters,
          page: 1,
          pqDraftDocEntry: filterValueToString(
            nextFilters.find((f) => f.id === "pqDraftDocEntry")?.value,
          ),
          pqDraftDocNum: filterValueToString(
            nextFilters.find((f) => f.id === "pqDraftDocNum")?.value,
          ),
        }),
      });
    },
    onColumnOrderChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnOrder) : updater;
      setOrder(TABLE_ID, cloneOrder(next));
      void navigate({
        replace: true,
        search: (prev: RfqSearch) => ({
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
        search: (prev: RfqSearch) => ({
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
        search: (prev: RfqSearch) => ({
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
        search: (prev: RfqSearch) => ({
          ...prev,
          sorting: nextSorting.length > 0 ? nextSorting : [],
        }),
      });
    },
    sortDescFirst: false,
    state: tableState,
  });

  const filteredTotalRows = table.getFilteredRowModel().rows.length;
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
      search: (prev: RfqSearch) => ({
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
        CardCode: undefined,
        DocNum: undefined,
        DocStatus: undefined,
        columnFilters: [],
        columnOrder: [...DEFAULT_COLUMN_ORDER],
        columnVisibility: {},
        limit: 10,
        page: 1,
        pqDraftDocEntry: undefined,
        pqDraftDocNum: undefined,
        sorting: [],
      }),
    });
  }, [setSorting, setVisibility, setOrder, clearAllFilters, setPagination, navigate]);

  if (showInitialSkeleton) {
    return <TableSkeleton />;
  }

  if (listQuery.isError && !listQuery.data) {
    return (
      <TableErrorState
        title="RFQs unavailable"
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
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <RfqLookupLayer tableId={TABLE_ID} table={table} onReset={handleResetTable} allRows={rows} />

      <div className="w-full flex-1 overflow-auto px-1.5">
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="align-top whitespace-nowrap py-3"
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
            {table.getRowModel().rows.length > 0 ? (
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

      <TablePagination tableId={TABLE_ID} table={table} totalRows={filteredTotalRows} />
    </div>
  );
}
