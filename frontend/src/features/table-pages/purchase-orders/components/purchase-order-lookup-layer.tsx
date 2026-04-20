import { useQuery, useQueryClient } from '@tanstack/react-query'
// PurchaseOrderLookupLayer: Orchestrates lookup popups and suggestions for order filtering.
import { type useReactTable } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'

import { LookupPopup } from '@/components/lookup/lookup-popup'
import { createSharedQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { type LookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { purchaseOrderQueries } from '@/features/table-pages/purchase-orders/api/purchase-order.queries'
import { type PurchaseOrderListItem } from '@/features/table-pages/purchase-orders/api/purchase-order.service'
import { TableToolbar } from '@/features/table-pages/table-shared/components/core/table-toolbar'
import { useTableLookupPopupSync } from '@/features/table-pages/table-shared/hooks/use-table-lookup-popup-sync'
import { useSetActiveFilterAction } from '@/store/table/table-filter.store'

const PO_BREADCRUMB = {
  section: 'Purchase',
  page: 'Purchase Orders Data Table',
  href: '/purchase/orders',
} as const
const DOC_NUM_QUICK_LIMIT = 10
const DOC_NUM_BACKGROUND_LIMIT = 100

const toOrderedUniqueDocNumSuggestions = (items: LookupItem[]): LookupItem[] => {
  const seen = new Set<string>()
  const result: LookupItem[] = []
  for (const item of items) {
    const code = item.code.trim()
    if (!code || seen.has(code)) continue
    seen.add(code)
    result.push({ code, name: item.name || code })
  }
  return result
}

export type PurchaseOrderLookupLayerProps = {
  tableId: string
  table: ReturnType<typeof useReactTable<PurchaseOrderListItem>>
  onReset: () => void
  onCreateClick: () => void
}

export function PurchaseOrderLookupLayer({
  tableId,
  table,
  onReset,
  onCreateClick,
}: PurchaseOrderLookupLayerProps) {
  const setActiveFilter = useSetActiveFilterAction()
  const queryClient = useQueryClient()

  const vendorsQuery = useQuery(createSharedQueries.vendors())
  const vendors = useMemo(() => vendorsQuery.data ?? [], [vendorsQuery.data])
  const tableRows = table.getRowModel().rows
  const {
    lookupPopupOpen,
    lookupColumnId,
    lookupSearch,
    debouncedLookupSearch,
    externalSelection,
    onLookupPopupIntent: handleLookupPopupIntent,
    onLookupPopupOpen: handleLookupPopupOpen,
    onLookupSearchChange: handleLookupSearchChange,
    onLookupPopupClose: handleLookupPopupClose,
    onLookupSelect: handleLookupSelect,
  } = useTableLookupPopupSync({
    table,
    tableId,
    // Sync Logic: Bridges toolbar search with global lookup popup state.
    onSetActiveFilter: (nextTableId, columnId) => setActiveFilter(nextTableId, columnId),
  })
  const docNumLookupSearchTerm = useMemo(
    () => debouncedLookupSearch.trim(),
    [debouncedLookupSearch],
  )
  const shouldQueryDocNumSearch = lookupColumnId === 'DocNum' && docNumLookupSearchTerm.length >= 2

  const docNumSuggestionsQuery = useQuery(
    purchaseOrderQueries.docNumSuggestions(undefined, DOC_NUM_QUICK_LIMIT),
  )
  const docNumSuggestionsBackgroundQuery = useQuery({
    ...purchaseOrderQueries.docNumSuggestions(undefined, DOC_NUM_BACKGROUND_LIMIT),
    enabled: docNumSuggestionsQuery.isFetched,
  })
  const tableOrderedDocNumSuggestions = useMemo<LookupItem[]>(() => {
    const seen = new Set<string>()
    const result: LookupItem[] = []
    for (const row of tableRows) {
      const raw = row.getValue('DocNum')
      const code = raw === null || raw === undefined ? '' : String(raw).trim()
      if (!code || seen.has(code)) continue
      seen.add(code)

      const cardCode = row.getValue('CardCode')
      const cardName = row.getValue('CardName')
      const name = cardCode ? `[${cardCode}] ${cardName || ''}`.trim() : code

      result.push({ code, name })
    }
    // Suggestion Logic: Merges table data with background API for immediate feedback.
    return result
  }, [tableRows])

  const docNumSuggestions = useMemo<LookupItem[]>(() => {
    const tableMatches = tableOrderedDocNumSuggestions
    const quickMatches = toOrderedUniqueDocNumSuggestions(docNumSuggestionsQuery.data?.data ?? [])
    const backgroundMatches = toOrderedUniqueDocNumSuggestions(
      docNumSuggestionsBackgroundQuery.data?.data ?? [],
    )

    const mergedSource = [...quickMatches, ...backgroundMatches]

    // Merge background matches after table matches, ensuring uniqueness.
    const seen = new Set(tableMatches.map((m) => m.code))
    const results = [...tableMatches]

    for (const item of mergedSource) {
      if (!seen.has(item.code)) {
        seen.add(item.code)
        results.push(item)
      }
      if (results.length >= DOC_NUM_BACKGROUND_LIMIT) break
    }

    return results
  }, [
    tableOrderedDocNumSuggestions,
    docNumSuggestionsQuery.data,
    docNumSuggestionsBackgroundQuery.data,
  ])

  const docNumLookupSearchQuery = useQuery({
    ...purchaseOrderQueries.docNumSuggestions(
      docNumLookupSearchTerm || undefined,
      DOC_NUM_BACKGROUND_LIMIT,
    ),
    enabled: shouldQueryDocNumSearch,
  })

  useEffect(() => {
    if (lookupColumnId !== 'DocNum') return
    void queryClient.prefetchQuery(
      purchaseOrderQueries.docNumSuggestions(undefined, DOC_NUM_BACKGROUND_LIMIT),
    )
  }, [lookupColumnId, queryClient])

  const docNumLookupResults = useMemo<LookupItem[]>(() => {
    if (lookupColumnId !== 'DocNum') return docNumSuggestions

    const term = docNumLookupSearchTerm.toLowerCase()

    // When no search term, show staged suggestions (10 first + background up to 100)
    if (!term) return docNumSuggestions

    const fromSearch = toOrderedUniqueDocNumSuggestions(docNumLookupSearchQuery.data?.data ?? [])
    const base = fromSearch.length > 0 ? fromSearch : docNumSuggestions
    return base
      .filter((item) => item.code.toLowerCase().includes(term))
      .slice(0, DOC_NUM_BACKGROUND_LIMIT)
  }, [lookupColumnId, docNumLookupSearchQuery.data, docNumSuggestions, docNumLookupSearchTerm])

  return (
    <>
      <TableToolbar
        tableId={tableId}
        table={table}
        onReset={onReset}
        onCreateClick={onCreateClick}
        createLink="/purchase/create-order"
        breadcrumb={PO_BREADCRUMB}
        lookupSuggestions={vendors}
        docNumSuggestions={docNumSuggestions}
        enableDocNumPopup
        preserveDocNumSuggestionOrder
        onLookupPopupIntent={handleLookupPopupIntent}
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
            ? docNumSuggestionsQuery.isFetching ||
              docNumSuggestionsBackgroundQuery.isFetching ||
              docNumLookupSearchQuery.isFetching
            : vendorsQuery.isFetching
        }
        error={
          lookupColumnId === 'DocNum'
            ? (docNumSuggestionsQuery.isError ||
                docNumSuggestionsBackgroundQuery.isError ||
                docNumLookupSearchQuery.isError) &&
              docNumLookupResults.length === 0
              ? 'Failed to load document numbers'
              : null
            : vendorsQuery.isError
              ? 'Failed to load vendors'
              : null
        }
        onRetry={
          lookupColumnId === 'DocNum'
            ? () => {
                void docNumSuggestionsQuery.refetch()
                void docNumSuggestionsBackgroundQuery.refetch()
                if (shouldQueryDocNumSearch) {
                  void docNumLookupSearchQuery.refetch()
                }
              }
            : () => {
                void vendorsQuery.refetch()
              }
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
        onSelect={(item) => handleLookupSelect(item, lookupColumnId)}
      />
    </>
  )
}
