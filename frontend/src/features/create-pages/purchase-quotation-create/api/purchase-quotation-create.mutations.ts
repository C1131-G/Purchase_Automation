import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createSharedKeys } from "@/features/create-pages/create-shared/api/create-shared.queries";
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
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: createSharedKeys.products() });
      queryClient.removeQueries({
        queryKey: createSharedKeys.productWarehouseStocks(),
      });

      await Promise.all([
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
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: createSharedKeys.products() });
      queryClient.removeQueries({
        queryKey: createSharedKeys.productWarehouseStocks(),
      });

      await Promise.all([
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
