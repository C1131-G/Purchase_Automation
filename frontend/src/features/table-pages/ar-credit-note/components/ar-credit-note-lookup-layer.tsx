import { useQuery, useQueryClient } from '@tanstack/react-query'
// ARCreditNoteLookupLayer: Orchestrates lookup popups and suggestions for accounts receivable credit filtering.
import { type useReactTable } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'

import { LookupPopup } from '@/components/lookup/lookup-popup'
import { createSharedQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { type LookupItem } from '@/features/create-pages/create-shared/api/create-shared.types'
import { arCreditNoteQueries } from '@/features/table-pages/ar-credit-note/api/ar-credit-note.queries'
import { type ARCreditNoteListItem } from '@/features/table-pages/ar-credit-note/api/ar-credit-note.service'
import { TableToolbar } from '@/features/table-pages/table-shared/components/core/table-toolbar'
import { useTableLookupPopupSync } from '@/features/table-pages/table-shared/hooks/use-table-lookup-popup-sync'
import { useSetActiveFilterAction } from '@/store/table/table-filter.store'

const AR_CREDIT_NOTE_BREADCRUMB = {
  section: 'Sales',
  page: 'AR Credit Notes Data Table',
  href: '/sales/ar-credit-note',
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
    result.push({ code, name: code })
  }
  return result
}

export type ARCreditNoteLookupLayerProps = {
  tableId: string
  table: ReturnType<typeof useReactTable<ARCreditNoteListItem>>
  onReset: () => void
  onCreateClick: () => void
}

export function ARCreditNoteLookupLayer({
  tableId,
  table,
  onReset,
  onCreateClick,
}: ARCreditNoteLookupLayerProps) {
  const setActiveFilter = useSetActiveFilterAction()
  const queryClient = useQueryClient()

  const customersQuery = useQuery(createSharedQueries.customers())
  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data])
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
    onSetActiveFilter: (nextTableId, columnId) => setActiveFilter(nextTableId, columnId),
  })
  const docNumLookupSearchTerm = useMemo(
    () => debouncedLookupSearch.trim(),
    [debouncedLookupSearch],
  )
  const shouldQueryDocNumSearch = lookupColumnId === 'DocNum' && docNumLookupSearchTerm.length >= 2

  const docNumSuggestionsQuery = useQuery(
    arCreditNoteQueries.docNumSuggestions(undefined, DOC_NUM_QUICK_LIMIT),
  )
  const docNumSuggestionsBackgroundQuery = useQuery({
    ...arCreditNoteQueries.docNumSuggestions(undefined, DOC_NUM_BACKGROUND_LIMIT),
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
      result.push({ code, name: code })
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
    ...arCreditNoteQueries.docNumSuggestions(
      docNumLookupSearchTerm || undefined,
      DOC_NUM_BACKGROUND_LIMIT,
    ),
    enabled: shouldQueryDocNumSearch,
  })

  useEffect(() => {
    if (lookupColumnId !== 'DocNum') return
    void queryClient.prefetchQuery(
      arCreditNoteQueries.docNumSuggestions(undefined, DOC_NUM_BACKGROUND_LIMIT),
    )
  }, [lookupColumnId, queryClient])

  const docNumLookupResults = useMemo<LookupItem[]>(() => {
    if (lookupColumnId !== 'DocNum') return docNumSuggestions

    const term = docNumLookupSearchTerm.toLowerCase()
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
        createLink="/sales/create-ar-credit-note"
        breadcrumb={AR_CREDIT_NOTE_BREADCRUMB}
        lookupSuggestions={customers}
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
            ? 'customer-code'
            : lookupColumnId === 'CardCode'
              ? 'customer-code'
              : 'customer-name'
        }
        search={lookupSearch}
        results={lookupColumnId === 'DocNum' ? docNumLookupResults : customers}
        loading={
          lookupColumnId === 'DocNum'
            ? docNumSuggestionsQuery.isFetching ||
              docNumSuggestionsBackgroundQuery.isFetching ||
              docNumLookupSearchQuery.isFetching
            : customersQuery.isFetching
        }
        error={
          lookupColumnId === 'DocNum'
            ? (docNumSuggestionsQuery.isError ||
                docNumSuggestionsBackgroundQuery.isError ||
                docNumLookupSearchQuery.isError) &&
              docNumLookupResults.length === 0
              ? 'Failed to load document numbers'
              : null
            : customersQuery.isError
              ? 'Failed to load customers'
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
                void customersQuery.refetch()
              }
        }
        title={
          lookupColumnId === 'DocNum'
            ? 'Search Doc Number'
            : lookupColumnId === 'CardCode'
              ? 'Search Customer Code'
              : 'Search Customer Name'
        }
        searchPlaceholder={
          lookupColumnId === 'DocNum'
            ? 'Search document number'
            : lookupColumnId === 'CardCode'
              ? 'Search customer code'
              : 'Search customer name'
        }
        onSearchChange={handleLookupSearchChange}
        onClose={handleLookupPopupClose}
        onSelect={(item) => handleLookupSelect(item, lookupColumnId)}
      />
    </>
  )
}
