import { type Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { cn } from '@/utils/cn'

interface TableControlsProps<TData> {
  table: Table<TData>
  currentPage: number
  currentLimit: number
  totalRows: number
}

/**
 * TablePagination: Consolidated component matching the requested design.
 * Includes "Rows per page", "Page X of Y", and all navigation buttons.
 */
export function TablePagination<TData>({
  table,
  currentPage,
  currentLimit,
  totalRows,
}: TableControlsProps<TData>) {
  const pageSize = Math.max(currentLimit, 1)
  const pageIndex = Math.max(currentPage - 1, 0)
  const hasData = totalRows > 0
  const pageCount = hasData ? Math.ceil(totalRows / pageSize) : 1
  const safePageIndex = hasData ? Math.min(pageIndex, pageCount - 1) : 0
  const hasMultiplePages = hasData && pageCount > 1

  const canPrevious = hasMultiplePages && safePageIndex > 0
  const canNext = hasMultiplePages && safePageIndex < pageCount - 1

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
        <div className="w-[80px]">
          <Select.Root
            value={`${pageSize}`}
            disabled={!hasData}
            onValueChange={(value) => {
              const nextPageSize = Number(value)
              table.setPagination({ pageIndex: 0, pageSize: nextPageSize })
            }}
          >
            <Select.Trigger className="h-9 px-3 py-1 rounded-lg border-zinc-200 bg-white text-[10px] font-bold uppercase tracking-[0.15em] hover:text-blue-600 hover:border-blue-600 transition-all focus:border-blue-600 focus:outline-none ring-offset-0">
              <Select.Value />
              <Select.Icon>
                <svg
                  className="size-3.5 text-zinc-400 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner className="w-[70px]" side="top">
                <Select.Popup>
                  <Select.List>
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <Select.Item key={pageSize} value={`${pageSize}`} className="text-xs">
                        {pageSize}
                      </Select.Item>
                    ))}
                  </Select.List>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
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
          className="group size-9 p-0 rounded-lg text-zinc-400 hover:bg-transparent hover:text-blue-600 focus:ring-0 transition-all disabled:opacity-30"
          onClick={() => {
            table.setPageIndex(0)
          }}
          disabled={!hasMultiplePages || !canPrevious}
        >
          <ChevronsLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-1" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="group size-9 p-0 rounded-lg text-zinc-400 hover:bg-transparent hover:text-blue-600 focus:ring-0 transition-all disabled:opacity-30"
          onClick={() => {
            const nextPage = Math.max(safePageIndex - 1, 0)
            table.setPageIndex(nextPage)
          }}
          disabled={!hasMultiplePages || !canPrevious}
        >
          <ChevronLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="group size-9 p-0 rounded-lg text-zinc-400 hover:bg-transparent hover:text-blue-600 focus:ring-0 transition-all disabled:opacity-30"
          onClick={() => {
            const nextPage = Math.min(safePageIndex + 1, pageCount - 1)
            table.setPageIndex(nextPage)
          }}
          disabled={!hasMultiplePages || !canNext}
        >
          <ChevronRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="group size-9 p-0 rounded-lg text-zinc-400 hover:bg-transparent hover:text-blue-600 focus:ring-0 transition-all disabled:opacity-30"
          onClick={() => {
            const lastPage = pageCount - 1
            table.setPageIndex(lastPage)
          }}
          disabled={!hasMultiplePages || !canNext}
        >
          <ChevronsRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  )
}
