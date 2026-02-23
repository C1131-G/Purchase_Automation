/** Purchase Order Create Mutations: Mutation hooks for submitting PO documents. */
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createSharedKeys } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { purchaseOrderKeys } from '@/features/table-pages/purchase-orders/api/purchase-order.queries'
import { purchaseOrderAPI } from '@/features/table-pages/purchase-orders/api/purchase-order.service'

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      payload,
    }: {
      payload: Parameters<typeof purchaseOrderAPI.createPurchaseOrder>[0]
    }) => purchaseOrderAPI.createPurchaseOrder(payload),
    onSuccess: async () => {
      // Purchase Order creation starts a new entry cycle on the same page.
      // Drop dynamic product/stock caches so next open/search uses fresh data,
      // and refresh active lookups in background without blocking UI.
      queryClient.removeQueries({ queryKey: createSharedKeys.products() })
      queryClient.removeQueries({ queryKey: createSharedKeys.productWarehouseStocks() })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.vendors(),
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.warehouses(),
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.salesEmployees(),
          refetchType: 'active',
        }),
      ])
    },
  })
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number
      payload: Parameters<typeof purchaseOrderAPI.updatePurchaseOrder>[1]
    }) => purchaseOrderAPI.updatePurchaseOrder(id, payload),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: createSharedKeys.products() })
      queryClient.removeQueries({ queryKey: createSharedKeys.productWarehouseStocks() })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.vendors(),
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.warehouses(),
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.salesEmployees(),
          refetchType: 'active',
        }),
      ])
    },
  })
}
