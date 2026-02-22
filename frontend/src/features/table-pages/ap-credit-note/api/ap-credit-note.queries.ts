import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  apCreditNoteAPI,
  type APCreditNoteListParams,
} from '@/features/table-pages/ap-credit-note/api/ap-credit-note.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const apCreditNoteKeys = {
  all: ['ap-credit-notes'] as const,
  list: (params: APCreditNoteListParams) => [...apCreditNoteKeys.all, 'list', params] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...apCreditNoteKeys.all, 'doc-num-suggestions', search ?? '', limit ?? 'all'] as const,
}

export const apCreditNoteQueries = {
  list: (params: APCreditNoteListParams) =>
    queryOptions({
      queryKey: apCreditNoteKeys.list(params),
      queryFn: () => apCreditNoteAPI.getAPCreditNotes(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      queryKey: apCreditNoteKeys.docNumSuggestions(search, limit),
      queryFn: () => apCreditNoteAPI.getAPCreditNoteDocNums(search, limit),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
    }),
}
