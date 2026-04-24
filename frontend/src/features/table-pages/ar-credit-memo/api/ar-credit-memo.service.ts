/** AR Credit Memo Service: Direct API interaction for credit business logic. */
import { z } from 'zod'

import {
  ArCreditMemoListItemSchema,
  ArCreditMemoListParamsSchema,
  ArCreditMemoListResponseSchema,
} from '@/features/table-pages/ar-credit-memo/schemas/ar-credit-memo-api.schema'
import { apiClient } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/query-string'

export type ArCreditMemoStatus = z.infer<typeof ArCreditMemoListItemSchema>['DocStatus']

export type ArCreditMemoListItem = z.infer<typeof ArCreditMemoListItemSchema>

export type ArCreditMemoListParams = z.infer<typeof ArCreditMemoListParamsSchema>

export type ArCreditMemoListResponse = z.infer<typeof ArCreditMemoListResponseSchema>
export type ArCreditMemoDocNumLookupItem = { code: string; name: string }
export type ArCreditMemoDocNumLookupResponse = {
  success: boolean
  data: ArCreditMemoDocNumLookupItem[]
}

export const ArCreditMemoAPI = {
  getArCreditMemos: async (params: ArCreditMemoListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/ar-credit-memos?${query}` : '/api/v1/ar-credit-memos'
    return apiClient<ArCreditMemoListResponse>(path)
  },
  createArCreditMemo: async (payload: Record<string, unknown>) => {
    return apiClient<unknown>('/api/v1/ar-credit-memos', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  getArCreditMemoById: async (id: string | number) => {
    return apiClient<{ success: boolean; data: unknown }>(`/api/v1/ar-credit-memos/${id}`)
  },
  getArCreditMemoDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit })
    const path = query
      ? `/api/v1/ar-credit-memos/docnums?${query}`
      : '/api/v1/ar-credit-memos/docnums'
    return apiClient<ArCreditMemoDocNumLookupResponse>(path)
  },
  updateArCreditMemo: async (id: string | number, payload: Record<string, unknown>) => {
    return apiClient<unknown>(`/api/v1/ar-credit-memos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
}
