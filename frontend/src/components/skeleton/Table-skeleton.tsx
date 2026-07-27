import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/features/table-pages/table-shared/components/core/table-root";

/**
 * Column widths matching the standard 6-column table layout:
 *   col-1  14%  w-20  (e.g. Doc Number)
 *   col-2  14%  w-22  (e.g. Doc Date)
 *   col-3  14%  w-24  (e.g. Code)
 *   col-4  30%  w-48  (e.g. Name – wide / truncated)
 *   col-5  14%  w-20  (e.g. Total / Amount)
 *   col-6  14%  w-14  (e.g. Status – short)
 */
const DEFAULT_COLUMN_WIDTHS = ["14%", "14%", "14%", "30%", "14%", "14%"] as const;
const DEFAULT_CELL_WIDTHS = ["w-20", "w-22", "w-24", "w-48", "w-20", "w-14"] as const;

/** IC notifications: Created · Message · Status · Priority · Read */
export const IC_NOTIFICATION_SKELETON_COLUMNS = {
  cellWidths: ["w-28", "w-48", "w-14", "w-14", "w-12"] as const,
  columnWidths: ["15%", "50%", "12%", "12%", "7%"] as const,
} as const;

const ROW_COUNT = 10;

const ROW_KEYS = [
  "sk-r-1",
  "sk-r-2",
  "sk-r-3",
  "sk-r-4",
  "sk-r-5",
  "sk-r-6",
  "sk-r-7",
  "sk-r-8",
  "sk-r-9",
  "sk-r-10",
] as const;

/** Pulsing pill used for a single skeleton cell value. */
function CellPulse({ widthClass }: { widthClass: string }) {
  return <div className={`h-4 rounded bg-zinc-100 animate-pulse ${widthClass}`} />;
}

export interface TableSkeletonToolbarOptions {
  /** Show Create button pulse (default true). */
  showCreate?: boolean;
  /** Show View button pulse (default true). */
  showView?: boolean;
  /** Show Filter button pulse (default true). */
  showFilter?: boolean;
  /**
   * Extra end-action pulse(s) after View / Filter (e.g. Mark all).
   * Rendered before Create when Create is shown.
   */
  endActionWidths?: readonly string[];
}

/**
 * Toolbar skeleton – mirrors TableToolbar.
 *
 * Single row, border-b border-zinc-100, px-6 py-3
 * LEFT:  breadcrumb pill
 * RIGHT: [Filter] [View] [end actions…] [Create] — optional per flags
 */
function ToolbarSkeleton({
  showCreate = true,
  showView = true,
  showFilter = true,
  endActionWidths = [],
}: TableSkeletonToolbarOptions) {
  const hasRightActions = showFilter || showView || endActionWidths.length > 0 || showCreate;

  return (
    <div className="border-b border-zinc-100 bg-white">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: breadcrumb pill */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/60 bg-zinc-50/50 px-3.5 py-1.5 shadow-xs">
            <div className="h-3 w-14 rounded bg-zinc-200 animate-pulse" />
            <div className="size-3 rounded bg-zinc-100 animate-pulse" />
            <div className="h-3 w-16 rounded bg-zinc-200 animate-pulse" />
            <div className="size-3 rounded bg-zinc-100 animate-pulse" />
            <div className="h-3 w-36 rounded bg-zinc-300 animate-pulse" />
          </div>
        </div>

        {hasRightActions ? (
          <div className="flex flex-1 items-center justify-end gap-2 pl-4">
            {showFilter ? (
              <div className="h-11 w-24 rounded-xl border border-zinc-200 bg-white animate-pulse shadow-sm" />
            ) : null}

            {showFilter && (showView || endActionWidths.length > 0 || showCreate) ? (
              <div className="mx-1 h-6 w-px bg-zinc-200" />
            ) : null}

            {showView ? (
              <div className="h-11 w-20 rounded-xl border border-zinc-200 bg-white animate-pulse shadow-sm" />
            ) : null}

            {showView && (endActionWidths.length > 0 || showCreate) ? (
              <div className="mx-1 h-6 w-px bg-zinc-200" />
            ) : null}

            {endActionWidths.map((widthClass, index) => (
              <div
                key={`sk-end-${widthClass}-${index}`}
                className={`h-11 rounded-xl border border-zinc-200 bg-white animate-pulse shadow-sm ${widthClass}`}
              />
            ))}

            {endActionWidths.length > 0 && showCreate ? (
              <div className="mx-1 h-6 w-px bg-zinc-200" />
            ) : null}

            {showCreate ? (
              <div className="h-11 w-28 rounded-xl border border-zinc-200 bg-white animate-pulse shadow-sm" />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Pagination footer skeleton – mirrors TablePagination chrome. */
function PaginationSkeleton() {
  return (
    <div className="flex items-center justify-end space-x-12 px-6 py-5 border-t border-zinc-100 bg-white">
      <div className="flex items-center space-x-3">
        <div className="h-4 w-24 rounded bg-zinc-200 animate-pulse" />
        <div className="h-9 w-20 rounded-lg border border-zinc-100 bg-zinc-50 animate-pulse" />
      </div>
      <div className="h-4 w-24 rounded bg-zinc-200 animate-pulse" />
      <div className="flex items-center space-x-1.5">
        <div className="size-9 rounded-lg bg-zinc-100 animate-pulse" />
        <div className="size-9 rounded-lg bg-zinc-100 animate-pulse" />
        <div className="size-9 rounded-lg bg-zinc-100 animate-pulse" />
        <div className="size-9 rounded-lg bg-zinc-100 animate-pulse" />
      </div>
    </div>
  );
}

export interface TableSkeletonProps {
  /** Column width percentages (e.g. "15%"). Defaults to standard 6-col layout. */
  columnWidths?: readonly string[];
  /** Tailwind width classes for cell pulses. Length should match columnWidths. */
  cellWidths?: readonly string[];
  /** Toolbar chrome options (hide Create/View, Mark all pulse, etc.). */
  toolbar?: TableSkeletonToolbarOptions;
  /**
   * Extra class on a column’s header/cell (by index).
   * Used for left-aligned Read column with right gap.
   */
  columnClassNames?: readonly (string | undefined)[];
}

/**
 * Shared loading skeleton for data tables.
 * Optional props keep IC notifications (and similar) layout-matched without layout shift.
 */
export function TableSkeleton({
  columnWidths = DEFAULT_COLUMN_WIDTHS,
  cellWidths = DEFAULT_CELL_WIDTHS,
  toolbar,
  columnClassNames,
}: TableSkeletonProps = {}) {
  const colCount = columnWidths.length;

  return (
    <div className="h-full w-full overflow-hidden bg-white flex flex-col">
      <ToolbarSkeleton {...toolbar} />

      <div className="flex-1 overflow-auto w-full px-1.5">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              {columnWidths.map((width, i) => (
                <TableHead
                  key={`sk-h-${i}`}
                  className={`align-top py-3 whitespace-nowrap ${columnClassNames?.[i] ?? ""}`}
                  style={{ width }}
                >
                  <div
                    className={`h-3 rounded bg-zinc-200 animate-pulse ${
                      i === colCount - 1 && columnClassNames?.[i]?.includes("text-left")
                        ? "ml-0 w-10"
                        : "ml-2 w-20"
                    }`}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {ROW_KEYS.slice(0, ROW_COUNT).map((rowKey) => (
              <TableRow key={rowKey}>
                {columnWidths.map((width, i) => (
                  <TableCell
                    key={`${rowKey}-sk-c-${i}`}
                    className={columnClassNames?.[i] ?? undefined}
                    style={{ width }}
                  >
                    <CellPulse widthClass={cellWidths[i] ?? "w-24"} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PaginationSkeleton />
    </div>
  );
}
