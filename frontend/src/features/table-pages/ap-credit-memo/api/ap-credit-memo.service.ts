/** AP Credit Memo Service: Direct API interaction for credit memo business logic. */
import { z } from 'zod'

import {
  apCreditMemoListItemSchema,
  apCreditMemoListParamsSchema,
  apCreditMemoListResponseSchema,
} from '@/features/table-pages/ap-credit-memo/schemas/ap-credit-memo-api.schema'
import { apiClient } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/query-string'

export type APCreditMemoStatus = z.infer<typeof apCreditMemoListItemSchema>['DocStatus']

export type APCreditMemoListItem = z.infer<typeof apCreditMemoListItemSchema>

export type APCreditMemoListParams = z.infer<typeof apCreditMemoListParamsSchema>

export type APCreditMemoListResponse = z.infer<typeof apCreditMemoListResponseSchema>
export type APCreditMemoDocNumLookupItem = { code: string; name: string }
export type APCreditMemoDocNumLookupResponse = {
  success: boolean
  data: APCreditMemoDocNumLookupItem[]
}

export const apCreditMemoAPI = {
  getAPCreditMemos: async (params: APCreditMemoListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/ap-credit-memos?${query}` : '/api/v1/ap-credit-memos'
    return apiClient<APCreditMemoListResponse>(path)
  },
  getAPCreditMemoDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit })
    const path = query
      ? `/api/v1/ap-credit-memos/docnums?${query}`
      : '/api/v1/ap-credit-memos/docnums'
    return apiClient<APCreditMemoDocNumLookupResponse>(path)
  },
}
