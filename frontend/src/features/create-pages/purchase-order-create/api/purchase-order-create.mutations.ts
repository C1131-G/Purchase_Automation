/** Purchase Order Create Mutations: Mutation hooks for submitting PO documents. */
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createSharedKeys } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { invalidateIcCaches } from "@/features/intercompany/api/ic-cache-invalidation";
import { purchaseOrderKeys } from "@/features/table-pages/purchase-orders/api/purchase-order.queries";
import { purchaseOrderAPI } from "@/features/table-pages/purchase-orders/api/purchase-order.service";

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
    }: {
      payload: Parameters<typeof purchaseOrderAPI.createPurchaseOrder>[0];
    }) => purchaseOrderAPI.createPurchaseOrder(payload),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: createSharedKeys.products() });
      queryClient.removeQueries({
        queryKey: createSharedKeys.productWarehouseStocks(),
      });

      // Non-blocking: fire invalidations in background so isPending resolves immediately
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.vendors(),
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
        // Flow 2: IC may create peer A/R invoice + notify + update relationship map.
        invalidateIcCaches(queryClient, ["notifications", "relationshipMaps", "retries"]),
      ]);
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: Parameters<typeof purchaseOrderAPI.updatePurchaseOrder>[1];
    }) => purchaseOrderAPI.updatePurchaseOrder(id, payload),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: createSharedKeys.products() });
      queryClient.removeQueries({
        queryKey: createSharedKeys.productWarehouseStocks(),
      });

      // Non-blocking: fire invalidations in background so isPending resolves immediately
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.vendors(),
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
