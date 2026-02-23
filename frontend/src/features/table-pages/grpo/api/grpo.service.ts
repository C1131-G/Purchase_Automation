/** GRPO Service: Direct API interaction for receipt business logic. */
import { z } from 'zod'

import {
  grpoListItemSchema,
  grpoListParamsSchema,
  grpoListResponseSchema,
} from '@/features/table-pages/grpo/schemas/grpo-api.schema'
import { apiClient } from '@/shared/api/client'
import { toQueryString } from '@/shared/api/query-string'

export type GRPOStatus = z.infer<typeof grpoListItemSchema>['DocStatus']

export type GRPOListItem = z.infer<typeof grpoListItemSchema>

export type GRPOListParams = z.infer<typeof grpoListParamsSchema>

export type GRPOListResponse = z.infer<typeof grpoListResponseSchema>
export type GRPODocNumLookupItem = { code: string; name: string }
export type GRPODocNumLookupResponse = {
  success: boolean
  data: GRPODocNumLookupItem[]
}

export const grpoAPI = {
  getGRPOs: async (params: GRPOListParams) => {
    const query = toQueryString(params)
    const path = query ? `/api/v1/grpos?${query}` : '/api/v1/grpos'
    return apiClient<GRPOListResponse>(path)
  },
  getGRPODocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ search, limit })
    const path = query ? `/api/v1/grpos/docnums?${query}` : '/api/v1/grpos/docnums'
    return apiClient<GRPODocNumLookupResponse>(path)
  },
}
