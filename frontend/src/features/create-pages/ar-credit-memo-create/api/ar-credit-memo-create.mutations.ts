import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ArCreditMemoAPI } from "@/features/table-pages/ar-credit-memo/api/ar-credit-memo.service";

export const ArCreditMemoCreateKeys = {
  all: ["ar-credit-memo-create"] as const,
  create: () => [...ArCreditMemoKeys.all, "create"] as const,
};

// Fixed key reference from ArCreditMemoCreateKeys
const ArCreditMemoKeys = {
  all: ["ar-credit-memo-create"] as const,
};

export const useCreateArCreditMemoMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => ArCreditMemoAPI.createArCreditMemo(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ar-credit-memos"] });
    },
  });
};

export const useUpdateArCreditMemoMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Record<string, unknown> }) =>
      ArCreditMemoAPI.updateArCreditMemo(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ar-credit-memos"] });
    },
  });
};
