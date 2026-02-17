import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import {
  arCreditNoteAPI,
  type ARCreditNoteListParams,
} from '@/features/table-pages/ar-credit-note/api/ar-credit-note.service'
import { QUERY_CACHE_POLICY } from '@/shared/constants/query.constants'

export const arCreditNoteKeys = {
  all: ['ar-credit-notes'] as const,
  list: (params: ARCreditNoteListParams) => [...arCreditNoteKeys.all, 'list', params] as const,
}

export const arCreditNoteQueries = {
  list: (params: ARCreditNoteListParams) =>
    queryOptions({
      queryKey: arCreditNoteKeys.list(params),
      queryFn: () => arCreditNoteAPI.getARCreditNotes(params),
      placeholderData: keepPreviousData,
      staleTime: QUERY_CACHE_POLICY.list.staleTime,
      gcTime: QUERY_CACHE_POLICY.list.gcTime,
    }),
}
