/** AR Credit Note Service: Direct API interaction for credit business logic. */
import type { z } from "zod";

import type {
  arCreditNoteListItemSchema,
  arCreditNoteListParamsSchema,
  arCreditNoteListResponseSchema,
} from "@/features/table-pages/ar-credit-note/schemas/ar-credit-note-api.schema";
import { apiClient } from "@/shared/api/client";
import { toQueryString } from "@/shared/api/query-string";

export type ARCreditNoteStatus = z.infer<typeof arCreditNoteListItemSchema>["DocStatus"];

export type ARCreditNoteListItem = z.infer<typeof arCreditNoteListItemSchema>;

export type ARCreditNoteListParams = z.infer<typeof arCreditNoteListParamsSchema>;

export type ARCreditNoteListResponse = z.infer<typeof arCreditNoteListResponseSchema>;
export interface ARCreditNoteDocNumLookupItem {
  code: string;
  name: string;
}
export interface ARCreditNoteDocNumLookupResponse {
  success: boolean;
  data: ARCreditNoteDocNumLookupItem[];
}

export const arCreditNoteAPI = {
  createARCreditNote: async (payload: Record<string, unknown>) =>
    apiClient<unknown>("/api/v1/ar-credit-notes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getARCreditNoteByDocNum: async (docNum: string | number) =>
    apiClient<{ success: boolean; data: unknown }>(`/api/v1/ar-credit-notes/by-doc-num/${docNum}`),
  getARCreditNoteDocNums: async (search?: string, limit?: number) => {
    const query = toQueryString({ limit, search });
    const path = query
      ? `/api/v1/ar-credit-notes/docnums?${query}`
      : "/api/v1/ar-credit-notes/docnums";
    return apiClient<ARCreditNoteDocNumLookupResponse>(path);
  },
  getARCreditNotes: async (params: ARCreditNoteListParams) => {
    const query = toQueryString(params);
    const path = query ? `/api/v1/ar-credit-notes?${query}` : "/api/v1/ar-credit-notes";
    return apiClient<ARCreditNoteListResponse>(path);
  },
};
