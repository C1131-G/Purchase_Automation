import { type Column, type Table } from '@tanstack/react-table'

import { type LookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { type DateRangeFilter } from '@/features/table-pages/table-shared/utils/table-filter-values'

export interface BaseSearchProps<TData> {
  table: Table<TData>
  activeColumn: Column<TData, unknown>
  activeColumnId: string
  className?: string | undefined
}

export interface TextFilterSearchProps<TData> extends BaseSearchProps<TData> {
  activeFilterValue: unknown
  suggestions: LookupItem[]
  docNumSuggestions: LookupItem[]
  enableDocNumPopup: boolean
  preserveDocNumSuggestionOrder?: boolean
  onSelectSuggestion?: (item: LookupItem, columnId: string) => void
  onPopupOpen?: (columnId: string, initialSearch?: string) => void
  onPopupIntent?: (columnId: string, initialSearch?: string) => void
  /** Direct selection from popup — bypasses async URL filter-state round-trip for instant input sync */
  externalSelection?: { item: LookupItem; columnId: string } | null
}

export type NumberComparisonSearchProps<TData> = BaseSearchProps<TData>

export interface SelectFilterSearchProps<TData> extends BaseSearchProps<TData> {
  selectValue: string
  filterOptions: unknown
  onSearchChange: (value: string) => void
}

export interface DateFilterSearchProps<TData> extends BaseSearchProps<TData> {
  tableId: string
  activeFilterValue: unknown
  zustandDraft: DateRangeFilter | null
  setZustandDraft: (tableId: string, filterId: string, draft: DateRangeFilter) => void
}
