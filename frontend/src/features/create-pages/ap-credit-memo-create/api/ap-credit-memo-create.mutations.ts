import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createSharedKeys } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { apCreditMemoKeys } from '@/features/table-pages/ap-credit-memo/api/ap-credit-memo.queries'
import { apiClient } from '@/shared/api/client'

export type CreateAPCreditMemoInput = {
  CardCode: string
  DocDate?: string
  DocDueDate?: string
  Comments?: string
  DocumentLines: Array<{
    ItemCode: string
    Quantity: number
    UnitPrice: number
    DiscountPercent?: number
    UoMCode?: string | number
    UoMEntry?: number
    VatGroup?: string
    WarehouseCode?: string
    BaseEntry?: number
    BaseLine?: number
    BaseType?: number
    U_ReturnReason?: string
  }>
}

export type UpdateAPCreditMemoInput = {
  DocDueDate?: string | undefined
  Comments?: string | undefined
  NumAtCard?: string | undefined
}

export function useCreateAPCreditMemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ payload }: { payload: CreateAPCreditMemoInput }) => {
      return apiClient<{
        success: boolean
        message: string
        data: { DocEntry: number; DocNum: number }
      }>('/api/v1/ap-credit-memos', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: apCreditMemoKeys.all })
      queryClient.removeQueries({ queryKey: createSharedKeys.products() })
      queryClient.removeQueries({ queryKey: createSharedKeys.productWarehouseStocks() })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: apCreditMemoKeys.all }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.vendors(),
          refetchType: 'active',
        }),
      ])
    },
  })
}

export function useUpdateAPCreditMemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string | number
      payload: UpdateAPCreditMemoInput
    }) => {
      return apiClient<{ success: boolean; message: string }>('/api/v1/ap-credit-memos/' + id, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: apCreditMemoKeys.all })
      queryClient.removeQueries({ queryKey: createSharedKeys.products() })
      queryClient.removeQueries({ queryKey: createSharedKeys.productWarehouseStocks() })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: apCreditMemoKeys.all }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.vendors(),
          refetchType: 'active',
        }),
      ])
    },
  })
}
