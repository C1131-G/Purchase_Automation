import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate, useRouter } from "@tanstack/react-router";
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

import {
  IC_NOTIFICATION_SKELETON_COLUMNS,
  TableSkeleton,
} from "@/components/skeleton/Table-skeleton";
import { normalizeColumnFilters } from "@/components/types/filter-utils";
import {
  useMarkAllIcNotificationsRead,
  useMarkIcNotificationRead,
} from "@/features/intercompany/api/intercompany.mutations";
import { useIcNotifications } from "@/features/intercompany/api/intercompany.queries";
import {
  createIcNotificationColumns,
  IC_NOTIFICATION_DEFAULT_COLUMN_ORDER,
} from "@/features/intercompany/components/notifications/ic-notification-columns";
import { IcNotificationToolbar } from "@/features/intercompany/components/notifications/ic-notification-toolbar";
import type { IcNotification } from "@/features/intercompany/schemas/intercompany-api.schema";
import {
  prefetchIcNotificationDocLink,
  warmIcNotificationCreateTargets,
} from "@/features/intercompany/utils/ic-notification-doc-prefetch";
import {
  getIcNotificationPrimaryLink,
  type IcNotificationDocLink,
} from "@/features/intercompany/utils/ic-notification-navigation";
import {
  icNotificationColumnFilterSchema,
  type IcNotificationColumnFilter,
  type IcNotificationSearch,
} from "@/features/intercompany/schemas/ic-notification-search.schema";
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

const routeApi = getRouteApi("/_layout/intercompany/notifications");
const TABLE_ID = "ic-notifications";
const DEFAULT_COLUMN_ORDER = [...IC_NOTIFICATION_DEFAULT_COLUMN_ORDER];

const toIcNotificationColumnFilters = (
  filters: ColumnFiltersState,
): IcNotificationColumnFilter[] => {
  const typedFilters: IcNotificationColumnFilter[] = [];
  for (const filter of filters) {
    const parsed = icNotificationColumnFilterSchema.safeParse(filter);
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

/**
 * Session-company IC notifications grid.
 * URL-first chrome (page, filters, sort); filtering/sort/page are client-side over the list API.
 */
/** Cap idle warm-up so a long notification list does not fan out dozens of detail fetches. */
const IDLE_DOC_PREFETCH_LIMIT = 12;

export function IcNotificationTable() {
  const searchParams = routeApi.useSearch();
  const navigate = useNavigate();
  const navigateRoute = routeApi.useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSorting = useSetSortingAction();
  const setVisibility = useSetVisibilityAction();
  const setOrder = useSetOrderAction();
  const setPagination = useSetPaginationAction();
  const setColumnFilters = useSetColumnFiltersAction();
  const clearAllFilters = useClearAllFiltersAction();

  const [markReadPendingId, setMarkReadPendingId] = useState<number | null>(null);

  const listQuery = useIcNotifications({});
  const markReadMutation = useMarkIcNotificationRead();
  const markAllMutation = useMarkAllIcNotificationsRead();

  useEffect(() => {
    window.scrollTo({ behavior: "smooth", top: 0 });
  }, []);

  // Warm create master data + route chunks while the list is open (not on click).
  useEffect(() => {
    warmIcNotificationCreateTargets(queryClient, router);
  }, [queryClient, router]);

  const handleMarkRead = useCallback(
    (notificationId: number) => {
      setMarkReadPendingId(notificationId);
      markReadMutation.mutate(notificationId, {
        onError: (error) => {
          toast.error("Could not mark notification read", {
            description: toSafeErrorMessage(
              error instanceof Error ? error.message : undefined,
              "Try again in a moment.",
            ),
          });
        },
        onSettled: () => {
          setMarkReadPendingId(null);
        },
        onSuccess: () => {
          toast.success("Marked as read");
        },
      });
    },
    [markReadMutation],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllMutation.mutate(undefined, {
      onError: (error) => {
        toast.error("Could not mark all as read", {
          description: toSafeErrorMessage(
            error instanceof Error ? error.message : undefined,
            "Try again in a moment.",
          ),
        });
      },
      onSuccess: (response) => {
        const marked = response.data.marked;
        toast.success(marked > 0 ? `Marked ${marked} as read` : "Nothing to mark");
      },
    });
  }, [markAllMutation]);

  const handleNotificationPrefetch = useCallback(
    (_notification: IcNotification, link: IcNotificationDocLink) => {
      prefetchIcNotificationDocLink(queryClient, router, link);
    },
    [queryClient, router],
  );

  const handleNotificationNavigate = useCallback(
    (notification: IcNotification, link: IcNotificationDocLink) => {
      // Start warm before navigation so route loaders hit cache (table create pattern).
      prefetchIcNotificationDocLink(queryClient, router, link);
      if (!notification.isRead) {
        markReadMutation.mutate(notification.notificationId);
      }
      void navigate({
        params: link.params,
        search: link.search ?? {},
        to: link.to,
      } as never);
    },
    [markReadMutation, navigate, queryClient, router],
  );

  const columns = useMemo(
    () =>
      createIcNotificationColumns({
        markReadPendingId,
        onMarkRead: handleMarkRead,
        onNavigate: handleNotificationNavigate,
        onPrefetch: handleNotificationPrefetch,
      }),
    [handleMarkRead, handleNotificationNavigate, handleNotificationPrefetch, markReadPendingId],
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
      // Only keep the three supported filters: Created At, Status, Priority.
      const allowed = new Set(["createdAt", "isRead", "priority"]);
      return cloneFilters(
        normalizeColumnFilters(searchParams.columnFilters).filter((f) => allowed.has(f.id)),
      );
    }
    const built: ColumnFiltersState = [];
    if (searchParams.isRead && searchParams.isRead !== "all") {
      built.push({ id: "isRead", value: searchParams.isRead });
    }
    if (searchParams.priority) {
      built.push({ id: "priority", value: searchParams.priority });
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

  // Idle-warm primary targets for the first page of notifications (hover is faster after this).
  useEffect(() => {
    if (rows.length === 0) {
      return;
    }

    let cancelled = false;
    const run = () => {
      if (cancelled) {
        return;
      }
      for (const notification of rows.slice(0, IDLE_DOC_PREFETCH_LIMIT)) {
        const link = getIcNotificationPrimaryLink(notification);
        if (link) {
          prefetchIcNotificationDocLink(queryClient, router, link);
        }
      }
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      const handle = idleWindow.requestIdleCallback(run, { timeout: 1500 });
      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(handle);
      };
    }

    const timeoutId = window.setTimeout(run, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [queryClient, router, rows]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns non-memoizable functions
  const table = useReactTable<IcNotification>({
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
      const nextSearchColumnFilters = toIcNotificationColumnFilters(nextFilters);

      const isReadVal = filterValueToString(nextFilters.find((f) => f.id === "isRead")?.value);
      const priorityVal = filterValueToString(nextFilters.find((f) => f.id === "priority")?.value);
      // Date range stays only in columnFilters (calendar), same as PQ Doc Date.
      const allowedFilters = nextSearchColumnFilters.filter(
        (f) => f.id === "createdAt" || f.id === "isRead" || f.id === "priority",
      );

      void navigateRoute({
        replace: true,
        search: (prev: IcNotificationSearch) => ({
          ...prev,
          columnFilters: allowedFilters,
          documentId: undefined,
          documentType: undefined,
          isRead:
            isReadVal === "unread" || isReadVal === "read" || isReadVal === "all"
              ? isReadVal
              : "all",
          page: 1,
          priority: priorityVal,
          q: undefined,
          title: undefined,
        }),
      });
    },
    onColumnOrderChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnOrder) : updater;
      setOrder(TABLE_ID, cloneOrder(next));
      void navigateRoute({
        replace: true,
        search: (prev: IcNotificationSearch) => ({
          ...prev,
          columnOrder: [...next],
        }),
      });
    },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnVisibility) : updater;
      const nextVisibility = normalizeVisibility(cloneVisibility(next));
      setVisibility(TABLE_ID, nextVisibility);
      void navigateRoute({
        replace: true,
        search: (prev: IcNotificationSearch) => ({
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
      void navigateRoute({
        replace: true,
        search: (prev: IcNotificationSearch) => ({
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
      void navigateRoute({
        replace: true,
        search: (prev: IcNotificationSearch) => ({
          ...prev,
          sorting: nextSorting.length > 0 ? nextSorting : [],
        }),
      });
    },
    sortDescFirst: false,
    state: tableState,
  });

  const filteredTotalRows = table.getFilteredRowModel().rows.length;
  const unreadCount = useMemo(() => rows.filter((row) => !row.isRead).length, [rows]);
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
    void navigateRoute({
      replace: true,
      search: (prev: IcNotificationSearch) => ({
        ...prev,
        page: clampedPageIndex + 1,
      }),
    });
  }, [pagination.pageIndex, maxPageIndex, filteredTotalRows, setPagination, navigateRoute]);

  const handleResetTable = useCallback(() => {
    setSorting(TABLE_ID, []);
    setVisibility(TABLE_ID, {});
    setOrder(TABLE_ID, [...DEFAULT_COLUMN_ORDER]);
    clearAllFilters(TABLE_ID);
    setPagination(TABLE_ID, { pageIndex: 0, pageSize: 10, totalRows: 0 });

    void navigateRoute({
      replace: true,
      search: (prev: IcNotificationSearch) => ({
        ...prev,
        columnFilters: [],
        columnOrder: [...DEFAULT_COLUMN_ORDER],
        columnVisibility: {},
        documentId: undefined,
        documentType: undefined,
        isRead: "all",
        limit: 10,
        page: 1,
        priority: undefined,
        q: undefined,
        sorting: [],
        title: undefined,
      }),
    });
  }, [setSorting, setVisibility, setOrder, clearAllFilters, setPagination, navigateRoute]);

  if (showInitialSkeleton) {
    return (
      <TableSkeleton
        columnWidths={IC_NOTIFICATION_SKELETON_COLUMNS.columnWidths}
        cellWidths={IC_NOTIFICATION_SKELETON_COLUMNS.cellWidths}
        // Match real toolbar: Filter + Mark all (no View / Create).
        toolbar={{
          showCreate: false,
          showView: false,
          showFilter: true,
          endActionWidths: ["w-28"],
        }}
        // Read column: left content + small right gap (mirrors live table).
        columnClassNames={[undefined, undefined, undefined, undefined, "pl-2 pr-4 text-left"]}
      />
    );
  }

  if (listQuery.isError && !listQuery.data) {
    return (
      <TableErrorState
        title="Notifications unavailable"
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
      <IcNotificationToolbar
        tableId={TABLE_ID}
        table={table}
        onReset={handleResetTable}
        onMarkAllRead={handleMarkAllRead}
        markAllPending={markAllMutation.isPending}
        unreadCount={unreadCount}
      />

      <div className="w-full flex-1 overflow-auto px-1.5">
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isActions = header.column.id === "actions";
                  return (
                    <TableHead
                      key={header.id}
                      className={
                        isActions
                          ? "align-top whitespace-nowrap py-3 pl-2 pr-4 text-left"
                          : "align-top whitespace-nowrap py-3"
                      }
                      style={{ width: `${header.getSize()}%` }}
                    >
                      <div className="flex items-center justify-start gap-2">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={row.original.isRead ? undefined : "bg-teal-50/30"}
                  data-unread={!row.original.isRead ? "true" : undefined}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isActions = cell.column.id === "actions";
                    return (
                      <TableCell
                        key={cell.id}
                        className={
                          isActions
                            ? // Pull content left; keep a little gap on the right edge of Read column.
                              "align-top pl-2 pr-4 text-left"
                            : "align-top"
                        }
                        style={{ width: `${cell.column.getSize()}%` }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-28 text-center"
                >
                  <div className="mx-auto max-w-sm space-y-1 py-4">
                    <p className="text-sm font-semibold text-ink-900">No notifications match</p>
                    <p className="text-sm text-neutral-500">
                      Clear filters or wait for intercompany activity for this company.
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
