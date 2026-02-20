import { type Table } from '@tanstack/react-table'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

import { Button } from '@/components/button'
import { Select } from '@/components/select/select'
import { cn } from '@/shared/utils/cn'
import { useTablePagination } from '@/store/table/table-pagination.store'

type TableControlsProps<TData> = {
  tableId: string
  table: Table<TData>
  totalRows: number
  onPrefetchPage?: (pageIndex: number, pageSize: number) => void
  onPrefetchPageSize?: (pageSize: number) => void
}

// TablePagination: Industrial pagination controller bridging TanStack index states with human-friendly UI.
export function TablePagination<TData>({
  tableId,
  table,
  totalRows,
  onPrefetchPage,
  onPrefetchPageSize,
}: TableControlsProps<TData>) {
  const pagination = useTablePagination(tableId)

  // METRICS: Ensure non-negative/positive values for calculations
  const pageSize = Math.max(pagination.pageSize || table.getState().pagination.pageSize, 1)
  const pageIndex = Math.max(pagination.pageIndex ?? table.getState().pagination.pageIndex, 0)

  const hasData = totalRows > 0
  const pageCount = hasData ? Math.ceil(totalRows / pageSize) : 1

  // INDEXING: `safePageIndex` prevents OOB (Out of Bounds) access
  const safePageIndex = hasData ? Math.min(pageIndex, pageCount - 1) : 0
  const hasMultiplePages = hasData && pageCount > 1

  const canPrevious = hasMultiplePages && safePageIndex > 0
  const canNext = hasMultiplePages && safePageIndex < pageCount - 1
  const getNextPageIndex = (currentIndex: number) => Math.min(currentIndex + 1, pageCount - 1)

  return (
    <div className="flex items-center justify-end space-x-12 px-6 py-5 border-t border-zinc-100 bg-white">
      {/* Rows per page section */}
      <div className="flex items-center space-x-3">
        <p
          className={cn(
            'text-[13px] font-semibold font-sans',
            !hasData ? 'text-zinc-300' : 'text-zinc-950',
          )}
        >
          Rows per page
        </p>
        <div className="w-20">
          <Select
            value={`${pageSize}`}
            disabled={!hasData}
            onValueChange={(value) => {
              const nextPageSize = Number(value.trim())
              // RESET: Always return to first page on size change to avoid OOB
              table.setPagination({
                pageIndex: 0,
                pageSize: nextPageSize,
              })
              onPrefetchPageSize?.(nextPageSize)
            }}
          >
            <Select.Trigger className="group h-9 px-3 py-1 rounded-lg border-zinc-200 bg-white text-[10px] font-bold uppercase tracking-[0.15em] hover:text-blue-600 hover:border-blue-600 transition-all focus:border-blue-600 focus:outline-none ring-offset-0">
              <Select.Value />
              <Select.Icon>
                <ChevronDown className="size-3.5 text-zinc-400 ml-1 transition-all duration-200 group-hover:translate-y-0.5 group-hover:text-blue-600 group-data-[state=open]:rotate-180" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner className="w-17.5" side="top">
                <Select.Popup>
                  <Select.List>
                    {[10, 20, 30, 40, 50].map((optionPageSize) => (
                      <Select.Item
                        key={optionPageSize}
                        value={`${optionPageSize}`}
                        className="text-xs"
                      >
                        {optionPageSize}
                      </Select.Item>
                    ))}
                  </Select.List>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select>
        </div>
      </div>

      {/* Page info section */}
      <div
        className={cn(
          'text-[13px] font-semibold font-sans',
          !hasData ? 'text-zinc-300' : 'text-zinc-950',
        )}
      >
        Page {safePageIndex + 1} of {pageCount}
      </div>

      {/* Navigation buttons section */}
      <div className="flex items-center space-x-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="group size-9 p-0 rounded-lg text-zinc-400 hover:bg-blue-50/30 hover:text-blue-600 focus:ring-0 transition-all disabled:opacity-30"
          onClick={() => {
            table.setPageIndex(0)
            if (pageCount > 1) {
              onPrefetchPage?.(getNextPageIndex(0), pageSize)
            }
          }}
          onMouseEnter={() => {
            if (!hasMultiplePages || !canPrevious) return
            onPrefetchPage?.(0, pageSize)
          }}
          onFocus={() => {
            if (!hasMultiplePages || !canPrevious) return
            onPrefetchPage?.(0, pageSize)
          }}
          disabled={!hasMultiplePages || !canPrevious}
        >
          <ChevronsLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-1" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="group size-9 p-0 rounded-lg text-zinc-400 hover:bg-blue-50/30 hover:text-blue-600 focus:ring-0 transition-all disabled:opacity-30"
          onClick={() => {
            const nextPage = Math.max(safePageIndex - 1, 0)
            table.setPageIndex(nextPage)
            if (nextPage < pageCount - 1) {
              onPrefetchPage?.(getNextPageIndex(nextPage), pageSize)
            }
          }}
          onMouseEnter={() => {
            if (!hasMultiplePages || !canPrevious) return
            onPrefetchPage?.(Math.max(safePageIndex - 1, 0), pageSize)
          }}
          onFocus={() => {
            if (!hasMultiplePages || !canPrevious) return
            onPrefetchPage?.(Math.max(safePageIndex - 1, 0), pageSize)
          }}
          disabled={!hasMultiplePages || !canPrevious}
        >
          <ChevronLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="group size-9 p-0 rounded-lg text-zinc-400 hover:bg-blue-50/30 hover:text-blue-600 focus:ring-0 transition-all disabled:opacity-30"
          onClick={() => {
            const nextPage = Math.min(safePageIndex + 1, pageCount - 1)
            table.setPageIndex(nextPage)
            if (nextPage < pageCount - 1) {
              onPrefetchPage?.(getNextPageIndex(nextPage), pageSize)
            }
          }}
          onMouseEnter={() => {
            if (!hasMultiplePages || !canNext) return
            onPrefetchPage?.(Math.min(safePageIndex + 1, pageCount - 1), pageSize)
          }}
          onFocus={() => {
            if (!hasMultiplePages || !canNext) return
            onPrefetchPage?.(Math.min(safePageIndex + 1, pageCount - 1), pageSize)
          }}
          disabled={!hasMultiplePages || !canNext}
        >
          <ChevronRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="group size-9 p-0 rounded-lg text-zinc-400 hover:bg-blue-50/30 hover:text-blue-600 focus:ring-0 transition-all disabled:opacity-30"
          onClick={() => {
            const lastPage = pageCount - 1
            table.setPageIndex(lastPage)
          }}
          onMouseEnter={() => {
            if (!hasMultiplePages || !canNext) return
            onPrefetchPage?.(pageCount - 1, pageSize)
          }}
          onFocus={() => {
            if (!hasMultiplePages || !canNext) return
            onPrefetchPage?.(pageCount - 1, pageSize)
          }}
          disabled={!hasMultiplePages || !canNext}
        >
          <ChevronsRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  )
}
