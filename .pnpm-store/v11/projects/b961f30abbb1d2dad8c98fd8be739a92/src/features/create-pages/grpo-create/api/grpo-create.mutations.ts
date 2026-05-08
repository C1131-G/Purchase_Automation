import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createSharedKeys } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { grpoKeys } from "@/features/table-pages/grpo/api/grpo.queries";
import { grpoAPI } from "@/features/table-pages/grpo/api/grpo.service";

export function useCreateGRPO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload }: { payload: Parameters<typeof grpoAPI.createGRPO>[0] }) =>
      grpoAPI.createGRPO(payload),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: grpoKeys.all });
      queryClient.removeQueries({ queryKey: createSharedKeys.products() });
      queryClient.removeQueries({
        queryKey: createSharedKeys.productWarehouseStocks(),
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: grpoKeys.all }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.vendors(),
          refetchType: "active",
        }),
      ]);
    },
  });
}

export function useUpdateGRPO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: Parameters<typeof grpoAPI.updateGRPO>[1];
    }) => grpoAPI.updateGRPO(id, payload),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: grpoKeys.all });
      queryClient.removeQueries({ queryKey: createSharedKeys.products() });
      queryClient.removeQueries({
        queryKey: createSharedKeys.productWarehouseStocks(),
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: grpoKeys.all }),
        queryClient.invalidateQueries({
          queryKey: createSharedKeys.vendors(),
          refetchType: "active",
        }),
      ]);
    },
  });
}
