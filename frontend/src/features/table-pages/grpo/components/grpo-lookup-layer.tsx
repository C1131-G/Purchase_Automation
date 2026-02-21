import { useQuery } from '@tanstack/react-query'
import { type useReactTable } from '@tanstack/react-table'
import { useMemo } from 'react'

import { LookupPopup } from '@/components/lookup/lookup-popup'
import { createSharedQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { type LookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { grpoQueries } from '@/features/table-pages/grpo/api/grpo.queries'
import { type GRPOListItem } from '@/features/table-pages/grpo/api/grpo.service'
import { TableToolbar } from '@/features/table-pages/table-shared/components/core/table-toolbar'
import { useTableLookupPopupSync } from '@/features/table-pages/table-shared/hooks/use-table-lookup-popup-sync'
import { useSetActiveFilterAction } from '@/store/table/table-filter.store'

const GRPO_BREADCRUMB = {
  section: 'Purchase',
  page: 'GRPO Data Table',
  href: '/purchase/grpo',
} as const

const toOrderedUniqueDocNumSuggestions = (items: LookupItem[]): LookupItem[] => {
  const seen = new Set<string>()
  const result: LookupItem[] = []
  for (const item of items) {
    const code = item.code.trim()
    if (!code || seen.has(code)) continue
    seen.add(code)
    result.push({ code, name: code })
  }
  return result
}

export type GRPOLookupLayerProps = {
  tableId: string
  table: ReturnType<typeof useReactTable<GRPOListItem>>
  onReset: () => void
  onCreateClick: () => void
}

export function GRPOLookupLayer({ tableId, table, onReset, onCreateClick }: GRPOLookupLayerProps) {
  const setActiveFilter = useSetActiveFilterAction()

  const vendorsQuery = useQuery(createSharedQueries.vendors())
  const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data])
  const tableRows = table.getRowModel().rows

  const docNumSuggestionsQuery = useQuery(grpoQueries.docNumSuggestions())
  const tableOrderedDocNumSuggestions = useMemo<LookupItem[]>(() => {
    const seen = new Set<string>()
    const result: LookupItem[] = []
    for (const row of tableRows) {
      const raw = row.getValue('DocNum')
      const code = raw === null || raw === undefined ? '' : String(raw).trim()
      if (!code || seen.has(code)) continue
      seen.add(code)
      result.push({ code, name: code })
    }
    return result
  }, [tableRows])

  const docNumSuggestions = useMemo<LookupItem[]>(() => {
    const tableMatches = tableOrderedDocNumSuggestions
    const backgroundMatches = toOrderedUniqueDocNumSuggestions(
      docNumSuggestionsQuery.data?.data ?? [],
    )

    // Merge background matches after table matches, ensuring uniqueness
    const seen = new Set(tableMatches.map((m) => m.code))
    const results = [...tableMatches]

    for (const item of backgroundMatches) {
      if (!seen.has(item.code)) {
        seen.add(item.code)
        results.push(item)
      }
    }

    return results
  }, [tableOrderedDocNumSuggestions, docNumSuggestionsQuery.data])

  const {
    lookupPopupOpen,
    lookupColumnId,
    lookupSearch,
    externalSelection,
    onLookupPopupOpen: handleLookupPopupOpen,
    onLookupSearchChange: handleLookupSearchChange,
    onLookupPopupClose: handleLookupPopupClose,
    onLookupSelect: handleLookupSelect,
  } = useTableLookupPopupSync({
    table,
    tableId,
    onSetActiveFilter: (nextTableId, columnId) => setActiveFilter(nextTableId, columnId),
  })

  const docNumLookupSearchTerm = useMemo(() => lookupSearch.trim(), [lookupSearch])
  const shouldQueryDocNumSearch = lookupColumnId === 'DocNum' && docNumLookupSearchTerm.length > 0
  const docNumLookupSearchQuery = useQuery({
    ...grpoQueries.docNumSuggestions(docNumLookupSearchTerm || undefined),
    enabled: shouldQueryDocNumSearch,
  })

  const docNumLookupResults = useMemo<LookupItem[]>(() => {
    if (lookupColumnId !== 'DocNum') return docNumSuggestions

    const term = docNumLookupSearchTerm.toLowerCase()

    // When no search term, show all suggestions in the preserved table order
    if (!term) return docNumSuggestions

    // Filter from the already-ordered merged list first (table rows + background)
    const fromMerged = docNumSuggestions.filter((item) => item.code.toLowerCase().includes(term))
    if (fromMerged.length > 0) return fromMerged

    // Supplement from the background search API if nothing found in the merged list
    const fromSearch = toOrderedUniqueDocNumSuggestions(
      docNumLookupSearchQuery.data?.data ?? [],
    ).filter((item) => item.code.toLowerCase().includes(term))

    return fromSearch.length > 0 ? fromSearch : docNumSuggestions
  }, [lookupColumnId, docNumLookupSearchQuery.data, docNumSuggestions, docNumLookupSearchTerm])

  return (
    <>
      <TableToolbar
        tableId={tableId}
        table={table}
        onReset={onReset}
        onCreateClick={onCreateClick}
        createLink="/purchase/create-grpo"
        breadcrumb={GRPO_BREADCRUMB}
        lookupSuggestions={vendors}
        docNumSuggestions={docNumSuggestions}
        enableDocNumPopup
        preserveDocNumSuggestionOrder
        onLookupPopupOpen={handleLookupPopupOpen}
        onLookupSelect={handleLookupSelect}
        lookupExternalSelection={externalSelection}
      />
      <LookupPopup
        open={lookupPopupOpen}
        mode={
          lookupColumnId === 'DocNum'
            ? 'vendor-code'
            : lookupColumnId === 'CardCode'
              ? 'vendor-code'
              : 'vendor-name'
        }
        search={lookupSearch}
        results={lookupColumnId === 'DocNum' ? docNumLookupResults : vendors}
        loading={
          lookupColumnId === 'DocNum'
            ? docNumSuggestionsQuery.isFetching || docNumLookupSearchQuery.isFetching
            : vendorsQuery.isFetching
        }
        error={
          lookupColumnId === 'DocNum'
            ? (docNumSuggestionsQuery.isError || docNumLookupSearchQuery.isError) &&
              docNumLookupResults.length === 0
              ? 'Failed to load document numbers'
              : null
            : vendorsQuery.isError
              ? 'Failed to load vendors'
              : null
        }
        title={
          lookupColumnId === 'DocNum'
            ? 'Search Doc Number'
            : lookupColumnId === 'CardCode'
              ? 'Search Vendor Code'
              : 'Search Vendor Name'
        }
        searchPlaceholder={
          lookupColumnId === 'DocNum'
            ? 'Search document number'
            : lookupColumnId === 'CardCode'
              ? 'Search vendor code'
              : 'Search vendor name'
        }
        onSearchChange={handleLookupSearchChange}
        onClose={handleLookupPopupClose}
        onSelect={handleLookupSelect}
      />
    </>
  )
}
