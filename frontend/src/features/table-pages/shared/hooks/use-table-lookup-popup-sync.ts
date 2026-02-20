import { type Table } from '@tanstack/react-table'
import { useCallback, useState } from 'react'

import { type LookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'

type UseTableLookupPopupSyncParams<TData> = {
  table: Table<TData>
  tableId: string
  onSetActiveFilter?: (tableId: string, columnId: string) => void
  allowedColumnIds?: string[]
}

type UseTableLookupPopupSyncResult = {
  lookupPopupOpen: boolean
  lookupColumnId: string
  lookupSearch: string
  externalSelection: { item: LookupItem; columnId: string } | null
  onLookupPopupOpen: (columnId: string, initialSearch?: string) => void
  onLookupSearchChange: (value: string) => void
  onLookupPopupClose: () => void
  onLookupSelect: (item: LookupItem) => void
}

const DEFAULT_LOOKUP_COLUMNS = ['CardCode', 'CardName', 'DocNum']

export function useTableLookupPopupSync<TData>({
  table,
  tableId,
  onSetActiveFilter,
  allowedColumnIds = DEFAULT_LOOKUP_COLUMNS,
}: UseTableLookupPopupSyncParams<TData>): UseTableLookupPopupSyncResult {
  const [lookupPopupOpen, setLookupPopupOpen] = useState(false)
  const [lookupColumnId, setLookupColumnId] = useState('')
  const [lookupSearch, setLookupSearch] = useState('')
  const [externalSelection, setExternalSelection] = useState<{
    item: LookupItem
    columnId: string
  } | null>(null)

  const onLookupPopupOpen = useCallback(
    (columnId: string, initialSearch?: string) => {
      if (!allowedColumnIds.includes(columnId)) return

      const column = table.getColumn(columnId)
      const filterValue = column?.getFilterValue()
      const trimmedInitial = initialSearch?.trim() ?? ''
      const searchVal =
        trimmedInitial.length > 0
          ? trimmedInitial
          : filterValue === null || filterValue === undefined
            ? ''
            : String(filterValue).trim()

      setLookupColumnId(columnId)
      setLookupSearch(searchVal)
      setExternalSelection(null)
      setLookupPopupOpen(true)
    },
    [allowedColumnIds, table],
  )

  const onLookupSearchChange = useCallback(
    (value: string) => {
      setLookupSearch(value)
      if (!lookupColumnId) return
      // Live-sync popup typing back to toolbar input.
      setExternalSelection({
        item: { code: value, name: value },
        columnId: lookupColumnId,
      })
    },
    [lookupColumnId],
  )

  const onLookupPopupClose = useCallback(() => {
    setLookupPopupOpen(false)
    setExternalSelection(null)
  }, [])

  const onLookupSelect = useCallback(
    (item: LookupItem) => {
      if (!lookupColumnId) return

      if (lookupColumnId === 'CardCode' || lookupColumnId === 'CardName') {
        const codeColumn = table.getColumn('CardCode')
        const nameColumn = table.getColumn('CardName')
        if (codeColumn) codeColumn.setFilterValue(item.code)
        if (nameColumn) nameColumn.setFilterValue(item.name)
      } else {
        const column = table.getColumn(lookupColumnId)
        if (column) {
          const value = lookupColumnId === 'DocNum' ? item.code : item.name
          column.setFilterValue(value)
        }
      }

      onSetActiveFilter?.(tableId, lookupColumnId)

      // Immediate input sync; clear after next tick to avoid stale overwrite.
      setExternalSelection({ item, columnId: lookupColumnId })
      window.setTimeout(() => setExternalSelection(null), 0)
      setLookupPopupOpen(false)
    },
    [lookupColumnId, onSetActiveFilter, table, tableId],
  )

  return {
    lookupPopupOpen,
    lookupColumnId,
    lookupSearch,
    externalSelection,
    onLookupPopupOpen,
    onLookupSearchChange,
    onLookupPopupClose,
    onLookupSelect,
  }
}
