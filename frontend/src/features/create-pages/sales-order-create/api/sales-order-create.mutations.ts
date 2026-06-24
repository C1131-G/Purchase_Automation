import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createSharedKeys } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { salesOrderKeys } from "@/features/table-pages/sales-orders/api/sales-order.queries";
import { salesOrderAPI } from "@/features/table-pages/sales-orders/api/sales-order.service";

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload }: { payload: Parameters<typeof salesOrderAPI.createSalesOrder>[0] }) =>
      salesOrderAPI.createSalesOrder(payload),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: createSharedKeys.products() });
      queryClient.removeQueries({
        queryKey: createSharedKeys.productWarehouseStocks(),
      });

      // Non-blocking: fire invalidations in background so isPending resolves immediately
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: salesOrderKeys.all }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.customers(),
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.warehouses(),
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.salesEmployees(),
          refetchType: "active",
        }),
      ]);
    },
  });
}

export function useUpdateSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: Parameters<typeof salesOrderAPI.updateSalesOrder>[1];
    }) => salesOrderAPI.updateSalesOrder(id, payload),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: createSharedKeys.products() });
      queryClient.removeQueries({
        queryKey: createSharedKeys.productWarehouseStocks(),
      });

      // Non-blocking: fire invalidations in background so isPending resolves immediately
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: salesOrderKeys.all }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.customers(),
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.warehouses(),
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.salesEmployees(),
          refetchType: "active",
        }),
      ]);
    },
  });
}
