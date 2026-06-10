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

export const useUploadAttachmentMutation = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const BASE_URL: string = import.meta.env.VITE_API_URL || "http://localhost:4000";
      const response = await fetch(`${BASE_URL}/api/v1/attachments`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        let errorMsg = "Failed to upload attachment";
        try {
          const errData = await response.json();
          errorMsg = JSON.stringify(errData);
        } catch {
          errorMsg = await response.text();
        }
        throw new Error(`Upload failed: ${response.status} ${errorMsg}`);
      }
      const data = await response.json();
      return data.attachmentEntry as number;
    },
  });
};
