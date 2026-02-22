import { z } from 'zod'

import {
  arCreditNoteListItemSchema,
  arCreditNoteListParamsSchema,
  arCreditNoteListResponseSchema,
} from '@/features/table-pages/ar-credit-note/schemas/ar-credit-note-api.schema'
import { apiClient } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/query-string'

export type ARCreditNoteStatus = z.infer<typeof arCreditNoteListItemSchema>['DocStatus']

export type ARCreditNoteListItem = z.infer<typeof arCreditNoteListItemSchema>

export type ARCreditNoteListParams = z.infer<typeof arCreditNoteListParamsSchema>

export type ARCreditNoteListResponse = z.infer<typeof arCreditNoteListResponseSchema>
export type ARCreditNoteDocNumLookupItem = { code: string; name: string }
export type ARCreditNoteDocNumLookupResponse = {
  success: boolean
  data: ARCreditNoteDocNumLookupItem[]
}

export const arCreditNoteAPI = {
  getARCreditNotes: async (params: ARCreditNoteListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/ar-credit-notes?${query}` : '/api/v1/ar-credit-notes'
    return apiClient<ARCreditNoteListResponse>(path)
  },
  getARCreditNoteDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit })
    const path = query
      ? `/api/v1/ar-credit-notes/docnums?${query}`
      : '/api/v1/ar-credit-notes/docnums'
    return apiClient<ARCreditNoteDocNumLookupResponse>(path)
  },
}
