import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";

export interface NodeResult {
  docEntry: number;
  docNum: number;
}

export interface RelationshipMapResult {
  salesQuotation: NodeResult[];
  salesOrder: NodeResult[];
  arInvoice: NodeResult[];
  arCreditMemo: NodeResult[];
  incomingPayment: NodeResult[];
  purchaseQuotation?: NodeResult[];
  purchaseOrder?: NodeResult[];
  grpo?: NodeResult[];
  apInvoice?: NodeResult[];
  apCreditMemo?: NodeResult[];
  outgoingPayment?: NodeResult[];
  delivery?: NodeResult[];
  goodsReceipt?: NodeResult[];
  goodsIssue?: NodeResult[];
  transferRequest?: NodeResult[];
  transfer?: NodeResult[];
}

export interface RelationshipMapResponse {
  success: boolean;
  data: RelationshipMapResult;
}

export const relationshipMapKeys = {
  all: ["relationship-map"] as const,
  map: (docType: string, docEntry: number) =>
    [...relationshipMapKeys.all, docType, docEntry] as const,
};

export const relationshipMapQueries = {
  map: (docType: string | undefined, docEntry: number | undefined) =>
    queryOptions({
      queryKey: relationshipMapKeys.map(docType ?? "", docEntry ?? 0),
      queryFn: async () => {
        if (!docType || !docEntry) return null;
        const res = await apiClient<RelationshipMapResponse>(
          `/api/v1/relationship-map/${docType}/${docEntry}`,
        );
        return res.data;
      },
      enabled: !!docType && !!docEntry && docEntry > 0,
      staleTime: 5 * 60 * 1000,
    }),
};
