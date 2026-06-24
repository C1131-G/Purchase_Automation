import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createSharedKeys } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { apInvoiceKeys } from "@/features/table-pages/ap-invoices/api/ap-invoice.queries";
import { apInvoiceAPI } from "@/features/table-pages/ap-invoices/api/ap-invoice.service";

export function useCreateAPInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload }: { payload: Parameters<typeof apInvoiceAPI.createAPInvoice>[0] }) =>
      apInvoiceAPI.createAPInvoice(payload),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: apInvoiceKeys.all });
      queryClient.removeQueries({ queryKey: createSharedKeys.products() });
      queryClient.removeQueries({
        queryKey: createSharedKeys.productWarehouseStocks(),
      });

      // Non-blocking: fire invalidations in background so isPending resolves immediately
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: apInvoiceKeys.all }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.vendors(),
          refetchType: "active",
        }),
      ]);
    },
  });
}

export function useUpdateAPInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: Parameters<typeof apInvoiceAPI.updateAPInvoice>[1];
    }) => apInvoiceAPI.updateAPInvoice(id, payload),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: apInvoiceKeys.all });
      queryClient.removeQueries({ queryKey: createSharedKeys.products() });
      queryClient.removeQueries({
        queryKey: createSharedKeys.productWarehouseStocks(),
      });

      // Non-blocking: fire invalidations in background so isPending resolves immediately
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: apInvoiceKeys.all }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.vendors(),
          refetchType: "active",
        }),
      ]);
    },
  });
}
