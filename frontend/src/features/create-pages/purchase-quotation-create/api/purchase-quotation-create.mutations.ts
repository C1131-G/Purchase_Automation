import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createSharedKeys } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { invalidateIcCaches } from "@/features/intercompany/api/ic-cache-invalidation";
import { purchaseQuotationKeys } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.queries";
import { purchaseQuotationAPI } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.service";

export function useCreatePurchaseQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
    }: {
      payload: Parameters<typeof purchaseQuotationAPI.createPurchaseQuotation>[0];
    }) => purchaseQuotationAPI.createPurchaseQuotation(payload),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: createSharedKeys.products() });
      queryClient.removeQueries({
        queryKey: createSharedKeys.productWarehouseStocks(),
      });

      // Non-blocking: fire invalidations in background so isPending resolves immediately
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: purchaseQuotationKeys.all }),
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
        // Flow 1: IC may spawn RFQ for the peer company + link map nodes.
        invalidateIcCaches(queryClient, ["notifications", "relationshipMaps"]),
      ]);
    },
  });
}

export function useUpdatePurchaseQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: Parameters<typeof purchaseQuotationAPI.updatePurchaseQuotation>[1];
    }) => purchaseQuotationAPI.updatePurchaseQuotation(id, payload),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: createSharedKeys.products() });
      queryClient.removeQueries({
        queryKey: createSharedKeys.productWarehouseStocks(),
      });

      // Non-blocking: fire invalidations in background so isPending resolves immediately
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: purchaseQuotationKeys.all }),
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
