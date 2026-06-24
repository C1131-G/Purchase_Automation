import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createSharedKeys } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { apCreditMemoKeys } from "@/features/table-pages/ap-credit-memo/api/ap-credit-memo.queries";
import { apiClient } from "@/shared/api/client";

export interface CreateAPCreditMemoInput {
  CardCode: string;
  DocDate?: string;
  DocDueDate?: string;
  Comments?: string;
  Address?: string | undefined;
  Address2?: string | undefined;
  DocumentLines: {
    ItemCode: string;
    Quantity: number;
    UnitPrice: number;
    DiscountPercent?: number;
    UoMCode?: string | number;
    UoMEntry?: number;
    VatGroup?: string;
    WarehouseCode?: string;
    BaseEntry?: number;
    BaseLine?: number;
    BaseType?: number;
    U_ReturnReason?: string;
  }[];
  SalesPersonCode?: number | undefined;
  attachments?: any[];
}

export interface UpdateAPCreditMemoInput {
  DocDueDate?: string | undefined;
  Comments?: string | undefined;
  NumAtCard?: string | undefined;
  SalesPersonCode?: number | undefined;
  Address?: string | undefined;
  Address2?: string | undefined;
  attachments?: any[];
}

export function useCreateAPCreditMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payload }: { payload: CreateAPCreditMemoInput }) =>
      apiClient<{
        success: boolean;
        message: string;
        data: { DocEntry: number; DocNum: number };
      }>("/api/v1/ap-credit-memos", {
        body: JSON.stringify(payload),
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: apCreditMemoKeys.all });
      queryClient.removeQueries({ queryKey: createSharedKeys.products() });
      queryClient.removeQueries({
        queryKey: createSharedKeys.productWarehouseStocks(),
      });

      // Non-blocking: fire invalidations in background so isPending resolves immediately
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: apCreditMemoKeys.all }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.vendors(),
          refetchType: "active",
        }),
      ]);
    },
  });
}

export function useUpdateAPCreditMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string | number;
      payload: UpdateAPCreditMemoInput;
    }) =>
      apiClient<{ success: boolean; message: string }>(`/api/v1/ap-credit-memos/${id}`, {
        body: JSON.stringify(payload),
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: apCreditMemoKeys.all });
      queryClient.removeQueries({ queryKey: createSharedKeys.products() });
      queryClient.removeQueries({
        queryKey: createSharedKeys.productWarehouseStocks(),
      });

      // Non-blocking: fire invalidations in background so isPending resolves immediately
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: apCreditMemoKeys.all }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.vendors(),
          refetchType: "active",
        }),
      ]);
    },
  });
}
