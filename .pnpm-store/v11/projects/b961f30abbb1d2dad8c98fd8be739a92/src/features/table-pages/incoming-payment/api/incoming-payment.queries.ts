/** Incoming Payment Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { incomingPaymentAPI } from "@/features/table-pages/incoming-payment/api/incoming-payment.service";
import type { IncomingPaymentListParams } from "@/features/table-pages/incoming-payment/api/incoming-payment.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

export const incomingPaymentKeys = {
  all: ["incoming-payments"] as const,
  detail: (docNum: string) => [...incomingPaymentKeys.all, "detail", docNum] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...incomingPaymentKeys.all, "doc-num-suggestions", search ?? "", limit ?? "all"] as const,
  list: (params: IncomingPaymentListParams) =>
    [...incomingPaymentKeys.all, "list", params] as const,
};

export const incomingPaymentQueries = {
  detail: (docNum: string) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.detail.gcTime,
      queryFn: () => incomingPaymentAPI.getIncomingPayment(docNum),
      queryKey: incomingPaymentKeys.detail(docNum),
      staleTime: QUERY_CACHE_POLICY.detail.staleTime,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => incomingPaymentAPI.getIncomingPaymentDocNums(search, limit),
      queryKey: incomingPaymentKeys.docNumSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  list: (params: IncomingPaymentListParams) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => incomingPaymentAPI.getIncomingPayments(params),
      queryKey: incomingPaymentKeys.list(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
};
