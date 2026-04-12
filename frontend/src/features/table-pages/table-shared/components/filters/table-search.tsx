import { type ColumnMeta, type Table, type TableMeta } from '@tanstack/react-table'
import { useMemo } from 'react'

import { type LookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import {
  useSetDateFilterDraftAction,
  useTableColumnFilters,
  useTableDateFilterDraft,
} from '@/store/table/table-filter.store'

import { DateFilterSearch } from './search/date-filter-search'
import { NumberFilterSearch } from './search/number-filter-search'
import { SelectFilterSearch } from './search/select-filter-search'
import { TextFilterSearch } from './search/text-filter-search'

const EMPTY_SUGGESTIONS: LookupItem[] = []

interface TableSearchProps<TData> {
  table: Table<TData>
  activeFilterId: string | null
  className?: string
  suggestions?: LookupItem[]
  docNumSuggestions?: LookupItem[]
  enableDocNumPopup?: boolean
  preserveDocNumSuggestionOrder?: boolean
  onSelectSuggestion?: (item: LookupItem, columnId: string) => void
  onPopupOpen?: (columnId: string, initialSearch?: string) => void
  onPopupIntent?: (columnId: string, initialSearch?: string) => void
  externalSelection?: { item: LookupItem; columnId: string } | null
}

export function TableSearch<TData>({
  table,
  activeFilterId,
  className,
  suggestions,
  docNumSuggestions,
  enableDocNumPopup = false,
  preserveDocNumSuggestionOrder = false,
  onSelectSuggestion,
  onPopupOpen,
  onPopupIntent,
  externalSelection,
}: TableSearchProps<TData>) {
  const tableId = (table.options.meta as TableMeta<TData, unknown>)?.tableId ?? 'default'
  const storeColumnFilters = useTableColumnFilters(tableId)

  const zustandDraft = useTableDateFilterDraft(tableId, activeFilterId ?? '')
  const setZustandDraft = useSetDateFilterDraftAction()

  const activeColumn = table.getAllLeafColumns().find((column) => column.id === activeFilterId)

  const meta = activeColumn?.columnDef.meta as
    | ColumnMeta<TData, unknown, unknown, unknown>
    | undefined
  const activeColumnId = activeColumn?.id
  const filterType = meta?.filterType
  const filterOptions = meta?.filterOptions
  const activeFilterValue = activeColumn?.getFilterValue()

  const storeActiveFilterValue = useMemo(() => {
    if (!activeFilterId) return undefined
    return storeColumnFilters.find((f: { id: string; value: unknown }) => f.id === activeFilterId)
      ?.value
  }, [storeColumnFilters, activeFilterId])

  if (!activeColumn || !activeColumnId) {
    return null
  }

  const commonProps = {
    table,
    activeColumn,
    activeColumnId,
    className,
  }

  if (filterType === 'number-comparison') {
    return <NumberFilterSearch {...commonProps} />
  }

  if (filterType === 'date') {
    return (
      <DateFilterSearch
        {...commonProps}
        activeFilterValue={activeFilterValue}
        zustandDraft={zustandDraft}
        tableId={tableId}
        setZustandDraft={setZustandDraft}
      />
    )
  }

  if (filterType === 'select' || filterType === 'boolean') {
    const selectValue =
      (typeof activeFilterValue === 'string' ? activeFilterValue : undefined) ??
      (typeof storeActiveFilterValue === 'string' ? storeActiveFilterValue : undefined) ??
      ''

    return (
      <SelectFilterSearch
        {...commonProps}
        selectValue={selectValue}
        filterOptions={filterOptions}
        onSearchChange={(value) => {
          activeColumn.setFilterValue(value === '' ? undefined : value)
        }}
      />
    )
  }

  return (
    <TextFilterSearch
      key={activeColumnId}
      {...commonProps}
      activeFilterValue={activeFilterValue}
      suggestions={suggestions ?? EMPTY_SUGGESTIONS}
      docNumSuggestions={docNumSuggestions ?? EMPTY_SUGGESTIONS}
      enableDocNumPopup={enableDocNumPopup}
      preserveDocNumSuggestionOrder={preserveDocNumSuggestionOrder}
      {...(onSelectSuggestion ? { onSelectSuggestion } : {})}
      {...(onPopupOpen ? { onPopupOpen } : {})}
      {...(onPopupIntent ? { onPopupIntent } : {})}
      {...(externalSelection ? { externalSelection } : {})}
    />
  )
}
