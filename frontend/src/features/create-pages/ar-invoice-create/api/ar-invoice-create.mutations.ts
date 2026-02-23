import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createSharedKeys } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { arInvoiceKeys } from '@/features/table-pages/ar-invoices/api/ar-invoice.queries'
import {
  arInvoiceAPI,
  type CreateARInvoicePayload,
} from '@/features/table-pages/ar-invoices/api/ar-invoice.service'

export function useCreateARInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ payload }: { payload: CreateARInvoicePayload }) =>
      arInvoiceAPI.createARInvoice(payload),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: createSharedKeys.products() })
      queryClient.removeQueries({ queryKey: createSharedKeys.productWarehouseStocks() })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: arInvoiceKeys.all }),
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
