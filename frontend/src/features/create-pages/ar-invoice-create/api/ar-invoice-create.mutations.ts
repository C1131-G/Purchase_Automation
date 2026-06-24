import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createSharedKeys } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { arInvoiceKeys } from "@/features/table-pages/ar-invoices/api/ar-invoice.queries";
import { arInvoiceAPI } from "@/features/table-pages/ar-invoices/api/ar-invoice.service";
import type {
  CreateARInvoicePayload,
  UpdateARInvoicePayload,
} from "@/features/table-pages/ar-invoices/api/ar-invoice.service";

export function useCreateARInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload }: { payload: CreateARInvoicePayload }) =>
      arInvoiceAPI.createARInvoice(payload),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: createSharedKeys.products() });
      queryClient.removeQueries({
        queryKey: createSharedKeys.productWarehouseStocks(),
      });

      // Non-blocking: fire invalidations in background so isPending resolves immediately
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: arInvoiceKeys.all }),
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

export function useUpdateARInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: UpdateARInvoicePayload }) =>
      arInvoiceAPI.updateARInvoice(id, payload),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: createSharedKeys.products() });
      queryClient.removeQueries({
        queryKey: createSharedKeys.productWarehouseStocks(),
      });

      // Non-blocking: fire invalidations in background so isPending resolves immediately
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: arInvoiceKeys.all }),
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
