import { type ColumnFiltersState } from '@tanstack/react-table'

import { hasFilterValue } from '@/components/types/filter-utils'

export type FilterToggleAction =
  | { type: 'clear'; remainingFilters: ColumnFiltersState; nextActiveFilter: string | null }
  | { type: 'deactivate' }
  | { type: 'activate'; nextActiveFilter: string }

export const resolveFilterToggleAction = (
  columnId: string,
  activeFilter: string | null,
  rawColumnFilters: ColumnFiltersState,
): FilterToggleAction => {
  const hasAppliedValue = rawColumnFilters.some(
    (filter) => filter.id === columnId && hasFilterValue(filter.value),
  )

  if (hasAppliedValue) {
    const remainingFilters = rawColumnFilters.filter((filter) => filter.id !== columnId)
    const nextActiveFilter =
      activeFilter === columnId
        ? (remainingFilters.find((filter) => hasFilterValue(filter.value))?.id ?? null)
        : activeFilter

    return {
      type: 'clear',
      remainingFilters,
      nextActiveFilter,
    }
  }

  if (activeFilter === columnId) {
    return { type: 'deactivate' }
  }

  return { type: 'activate', nextActiveFilter: columnId }
}
