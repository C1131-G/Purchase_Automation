import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createSharedKeys } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { salesOrderKeys } from '@/features/table-pages/sales-orders/api/sales-order.queries'
import {
  type CreateSalesOrderPayload,
  salesOrderAPI,
} from '@/features/table-pages/sales-orders/api/sales-order.service'

export function useCreateSalesOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ payload }: { payload: CreateSalesOrderPayload }) =>
      salesOrderAPI.createSalesOrder(payload),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: createSharedKeys.products() })
      queryClient.removeQueries({ queryKey: createSharedKeys.productWarehouseStocks() })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: salesOrderKeys.all }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.customers(),
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
