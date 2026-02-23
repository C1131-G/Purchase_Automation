import { Link, useRouter } from '@tanstack/react-router'
import { type Table } from '@tanstack/react-table'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { Separator } from '@/components/separator'
import { SidebarTrigger } from '@/components/sidebar'
import { hasFilterValue } from '@/components/types/filter-utils'
import { type LookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { useSetActiveFilterAction, useTableActiveFilter } from '@/store/table/table-filter.store'

import { TableViewOptions } from '../controls/view-options'
import { TableFilterOptions } from '../filters/filter-options'
import { TableSearch } from '../filters/table-search'

const EMPTY_SUGGESTIONS: LookupItem[] = []

type TableToolbarProps<TData> = {
  tableId: string
  table: Table<TData>
  onReset: () => void
  onCreateClick?: () => void
  createLink?: string
  createLabel?: string
  breadcrumb?: {
    section: string
    page: string
    href: string
  }
  lookupSuggestions?: LookupItem[]
  docNumSuggestions?: LookupItem[]
  enableDocNumPopup?: boolean
  preserveDocNumSuggestionOrder?: boolean
  onLookupSelect?: (item: LookupItem, columnId: string) => void
  onLookupPopupOpen?: (columnId: string, initialSearch?: string) => void
  onLookupPopupIntent?: (columnId: string, initialSearch?: string) => void
  lookupExternalSelection?: { item: LookupItem; columnId: string } | null
}

export function TableToolbar<TData>({
  tableId,
  table,
  onReset,
  onCreateClick,
  createLink = '/purchase/create-order',
  createLabel = 'Create',
  breadcrumb,
  lookupSuggestions,
  docNumSuggestions,
  enableDocNumPopup = false,
  preserveDocNumSuggestionOrder = false,
  onLookupSelect,
  onLookupPopupOpen,
  onLookupPopupIntent,
  lookupExternalSelection,
}: TableToolbarProps<TData>) {
  const resolvedLookupSuggestions = lookupSuggestions ?? EMPTY_SUGGESTIONS
  const resolvedDocNumSuggestions = docNumSuggestions ?? EMPTY_SUGGESTIONS
  const router = useRouter()
  const activeFilterId = useTableActiveFilter(tableId)
  const setActiveFilter = useSetActiveFilterAction()
  const hasRestoredInitialFilter = useRef(false)
  const hasTriggeredCreatePrefetch = useRef(false)
  const tableColumnFilters = table.getState().columnFilters
  const filterableColumnIds = useMemo(
    () =>
      table
        .getAllLeafColumns()
        .filter((column) => column.getCanFilter())
        .map((column) => column.id),
    [table],
  )
  const lastAppliedFilterId = useMemo(() => {
    const applied = tableColumnFilters.filter(
      (filter) => filterableColumnIds.includes(filter.id) && hasFilterValue(filter.value),
    )
    const last = applied[applied.length - 1]
    return last?.id ?? null
  }, [tableColumnFilters, filterableColumnIds])
  useEffect(() => {
    if (hasRestoredInitialFilter.current) return
    if (activeFilterId) {
      hasRestoredInitialFilter.current = true
      return
    }
    if (lastAppliedFilterId) {
      setActiveFilter(tableId, lastAppliedFilterId)
    }
    hasRestoredInitialFilter.current = true
  }, [tableId, activeFilterId, lastAppliedFilterId, setActiveFilter])

  useEffect(() => {
    if (!activeFilterId) return
    if (!filterableColumnIds.includes(activeFilterId)) {
      setActiveFilter(tableId, null)
    }
  }, [tableId, activeFilterId, filterableColumnIds, setActiveFilter])

  const triggerCreatePrefetch = useCallback(() => {
    void router.preloadRoute({ to: createLink as never })
    if (!onCreateClick || hasTriggeredCreatePrefetch.current) return
    hasTriggeredCreatePrefetch.current = true
    onCreateClick()
  }, [createLink, onCreateClick, router])

  return (
    <div className="border-b border-zinc-100 bg-white">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left Side: Sidebar & Breadcrumb */}
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-3" />
          <Separator orientation="vertical" className="mx-2 h-6" />
          {breadcrumb ? (
            <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/85 px-4 py-2 text-xs font-medium tracking-normal text-zinc-600 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.32)] backdrop-blur-sm">
              <span>{breadcrumb.section}</span>
              <ChevronRight className="size-3.5 text-zinc-300" />
              <Link
                to={breadcrumb.href}
                preload="intent"
                className="text-blue-600 hover:text-blue-700"
              >
                {breadcrumb.page}
              </Link>
            </div>
          ) : null}
        </div>

        {/* Right Side: Search, Filters, View, Create */}
        <div className="flex flex-1 items-center justify-end gap-2 pl-4">
          <div className="w-[320px] shrink-0">
            <TableSearch
              className="w-full"
              table={table}
              activeFilterId={activeFilterId}
              suggestions={resolvedLookupSuggestions}
              docNumSuggestions={resolvedDocNumSuggestions}
              enableDocNumPopup={enableDocNumPopup}
              preserveDocNumSuggestionOrder={preserveDocNumSuggestionOrder}
              {...(onLookupSelect ? { onSelectSuggestion: onLookupSelect } : {})}
              {...(onLookupPopupOpen ? { onPopupOpen: onLookupPopupOpen } : {})}
              {...(onLookupPopupIntent ? { onPopupIntent: onLookupPopupIntent } : {})}
              {...(lookupExternalSelection ? { externalSelection: lookupExternalSelection } : {})}
            />
          </div>

          <TableFilterOptions tableId={tableId} table={table} />
          <Separator orientation="vertical" className="mx-1 h-6" />
          <TableViewOptions tableId={tableId} table={table} onReset={onReset} />
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Link
            to={createLink}
            preload="intent"
            preloadDelay={0}
            viewTransition
            onPointerEnter={triggerCreatePrefetch}
            onMouseEnter={triggerCreatePrefetch}
            onMouseOver={triggerCreatePrefetch}
            onFocus={triggerCreatePrefetch}
            onTouchStart={triggerCreatePrefetch}
            onClick={() => {
              onReset()
              triggerCreatePrefetch()
            }}
            className="group flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold tracking-normal text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 focus:outline-none focus:ring-0 active:scale-[0.98]"
          >
            {createLabel}
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  )
}
