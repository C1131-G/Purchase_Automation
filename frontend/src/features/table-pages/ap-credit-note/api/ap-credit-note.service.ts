import { z } from 'zod'

import {
  apCreditNoteListItemSchema,
  apCreditNoteListParamsSchema,
  apCreditNoteListResponseSchema,
} from '@/features/table-pages/ap-credit-note/schemas/ap-credit-note-api.schema'
import { apiClient } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/query-string'

export type APCreditNoteStatus = z.infer<typeof apCreditNoteListItemSchema>['DocStatus']

export type APCreditNoteListItem = z.infer<typeof apCreditNoteListItemSchema>

export type APCreditNoteListParams = z.infer<typeof apCreditNoteListParamsSchema>

export type APCreditNoteListResponse = z.infer<typeof apCreditNoteListResponseSchema>
export type APCreditNoteDocNumLookupItem = { code: string; name: string }
export type APCreditNoteDocNumLookupResponse = {
  success: boolean
  data: APCreditNoteDocNumLookupItem[]
}

export const apCreditNoteAPI = {
  getAPCreditNotes: async (params: APCreditNoteListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/ap-credit-notes?${query}` : '/api/v1/ap-credit-notes'
    return apiClient<APCreditNoteListResponse>(path)
  },
  getAPCreditNoteDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit })
    const path = query
      ? `/api/v1/ap-credit-notes/docnums?${query}`
      : '/api/v1/ap-credit-notes/docnums'
    return apiClient<APCreditNoteDocNumLookupResponse>(path)
  },
}
