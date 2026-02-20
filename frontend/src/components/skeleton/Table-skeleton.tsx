import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/features/table-pages/shared/components/core/table-root'

/**
 * Column widths matching the standard 6-column table layout:
 *   col-1  14%  w-20  (e.g. Doc Number)
 *   col-2  14%  w-22  (e.g. Doc Date)
 *   col-3  14%  w-24  (e.g. Code)
 *   col-4  30%  w-48  (e.g. Name – wide / truncated)
 *   col-5  14%  w-20  (e.g. Total / Amount)
 *   col-6  14%  w-14  (e.g. Status – short)
 */
const COLUMN_WIDTHS = ['14%', '14%', '14%', '30%', '14%', '14%'] as const
const CELL_WIDTHS = ['w-20', 'w-22', 'w-24', 'w-48', 'w-20', 'w-14'] as const

const ROW_COUNT = 10

const HEADER_KEYS = ['sk-h-1', 'sk-h-2', 'sk-h-3', 'sk-h-4', 'sk-h-5', 'sk-h-6'] as const

const ROW_KEYS = [
  'sk-r-1',
  'sk-r-2',
  'sk-r-3',
  'sk-r-4',
  'sk-r-5',
  'sk-r-6',
  'sk-r-7',
  'sk-r-8',
  'sk-r-9',
  'sk-r-10',
] as const

const CELL_KEYS = ['sk-c-1', 'sk-c-2', 'sk-c-3', 'sk-c-4', 'sk-c-5', 'sk-c-6'] as const

/** Pulsing pill used for a single skeleton cell value. */
function CellPulse({ widthClass }: { widthClass: string }) {
  return <div className={`h-4 rounded bg-zinc-100 animate-pulse ${widthClass}`} />
}

/**
 * Toolbar skeleton – mirrors TableToolbar exactly:
 *
 * Single row, border-b border-zinc-100, px-6 py-3
 * LEFT:  [SidebarTrigger] [vertical separator] [breadcrumb pill]
 * RIGHT: [Filter btn h-11] [separator] [View btn h-11] [separator] [Create btn h-11]
 * Note: search input (TableSearch) is hidden during skeleton — not rendered.
 */
function ToolbarSkeleton() {
  return (
    <div className="border-b border-zinc-100 bg-white">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: SidebarTrigger + separator + breadcrumb pill */}
        <div className="flex items-center gap-2">
          {/* SidebarTrigger (~size-7 square icon button) */}
          <div className="size-7 rounded-md bg-zinc-100 animate-pulse -ml-3" />

          {/* Vertical separator */}
          <div className="mx-2 h-6 w-px bg-zinc-200" />

          {/* Breadcrumb pill: rounded-2xl border, "Section > Page" */}
          <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/85 px-4 py-2 shadow-sm">
            <div className="h-3 w-14 rounded bg-zinc-200 animate-pulse" />
            <div className="size-3 rounded bg-zinc-100 animate-pulse" />
            <div className="h-3 w-36 rounded bg-zinc-300 animate-pulse" />
          </div>
        </div>

        {/* Right: Filter + separator + View + separator + Create — all h-11 rounded-xl */}
        <div className="flex flex-1 items-center justify-end gap-2 pl-4">
          {/* Filter button – matches h-11 rounded-xl border px-4 */}
          <div className="h-11 w-24 rounded-xl border border-zinc-200 bg-white animate-pulse shadow-sm" />

          {/* Separator */}
          <div className="mx-1 h-6 w-px bg-zinc-200" />

          {/* View button – matches h-11 rounded-xl border px-4 */}
          <div className="h-11 w-20 rounded-xl border border-zinc-200 bg-white animate-pulse shadow-sm" />

          {/* Separator */}
          <div className="mx-1 h-6 w-px bg-zinc-200" />

          {/* Create button – h-11 rounded-xl */}
          <div className="h-11 w-28 rounded-xl border border-zinc-200 bg-white animate-pulse shadow-sm" />
        </div>
      </div>
    </div>
  )
}

/** Pagination footer skeleton – mirrors TablePagination chrome. */
function PaginationSkeleton() {
  return (
    <div className="flex items-center justify-end space-x-12 px-6 py-5 border-t border-zinc-100 bg-white">
      {/* Rows-per-page label + select */}
      <div className="flex items-center space-x-3">
        <div className="h-4 w-24 rounded bg-zinc-200 animate-pulse" />
        <div className="h-9 w-20 rounded-lg border border-zinc-100 bg-zinc-50 animate-pulse" />
      </div>
      {/* "Page X of Y" */}
      <div className="h-4 w-24 rounded bg-zinc-200 animate-pulse" />
      {/* First / Prev / Next / Last */}
      <div className="flex items-center space-x-1.5">
        <div className="size-9 rounded-lg bg-zinc-100 animate-pulse" />
        <div className="size-9 rounded-lg bg-zinc-100 animate-pulse" />
        <div className="size-9 rounded-lg bg-zinc-100 animate-pulse" />
        <div className="size-9 rounded-lg bg-zinc-100 animate-pulse" />
      </div>
    </div>
  )
}

/**
 * Shared loading skeleton for all data tables.
 *
 * Renders a full-height layout that precisely mirrors the real table chrome:
 * toolbar (single-row), 6-column × 10-row body, pagination footer.
 * Zero layout shift when real data arrives.
 */
export function TableSkeleton() {
  return (
    <div className="h-full w-full overflow-hidden bg-white flex flex-col">
      <ToolbarSkeleton />

      <div className="flex-1 overflow-auto w-full px-1.5">
        <Table className="w-full min-w-300">
          <TableHeader>
            <TableRow>
              {COLUMN_WIDTHS.map((width, i) => (
                <TableHead
                  key={HEADER_KEYS[i]}
                  className="align-top py-3 whitespace-nowrap"
                  style={{ width }}
                >
                  <div className="ml-2 h-3 w-20 rounded bg-zinc-200 animate-pulse" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {ROW_KEYS.slice(0, ROW_COUNT).map((rowKey) => (
              <TableRow key={rowKey}>
                {COLUMN_WIDTHS.map((width, i) => (
                  <TableCell key={`${rowKey}-${CELL_KEYS[i]}`} style={{ width }}>
                    <CellPulse widthClass={CELL_WIDTHS[i] ?? 'w-24'} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PaginationSkeleton />
    </div>
  )
}
