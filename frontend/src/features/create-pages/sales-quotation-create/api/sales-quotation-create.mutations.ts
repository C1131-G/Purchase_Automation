import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createSharedKeys } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { salesQuotationKeys } from '@/features/table-pages/sales-quotations/api/sales-quotation.queries'
import { salesQuotationAPI } from '@/features/table-pages/sales-quotations/api/sales-quotation.service'

export function useCreateSalesQuotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      payload,
    }: {
      payload: Parameters<typeof salesQuotationAPI.createSalesQuotation>[0]
    }) => salesQuotationAPI.createSalesQuotation(payload),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: createSharedKeys.products() })
      queryClient.removeQueries({ queryKey: createSharedKeys.productWarehouseStocks() })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: salesQuotationKeys.all }),
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

export function useUpdateSalesQuotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number
      payload: Parameters<typeof salesQuotationAPI.updateSalesQuotation>[1]
    }) => salesQuotationAPI.updateSalesQuotation(id, payload),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: createSharedKeys.products() })
      queryClient.removeQueries({ queryKey: createSharedKeys.productWarehouseStocks() })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: salesQuotationKeys.all }),
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
