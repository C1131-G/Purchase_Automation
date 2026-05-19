/** Outgoing Payment Queries: TanStack Query keys and options for data fetching. */
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { outgoingPaymentAPI } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.service";
import type { OutgoingPaymentListParams } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.service";
import { QUERY_CACHE_POLICY } from "@/shared/constants/query.constants";

export const outgoingPaymentKeys = {
  all: ["outgoing-payments"] as const,
  detailByDocNum: (docNum: string) => [...outgoingPaymentKeys.all, "detail", docNum] as const,
  docNumSuggestions: (search?: string, limit?: number) =>
    [...outgoingPaymentKeys.all, "doc-num-suggestions", search ?? "", limit ?? "all"] as const,
  accountSuggestions: (search?: string, limit?: number) =>
    [...outgoingPaymentKeys.all, "account-suggestions", search ?? "", limit ?? 20] as const,
  bankSuggestions: (search?: string, limit?: number) =>
    [...outgoingPaymentKeys.all, "bank-suggestions", search ?? "", limit ?? 200] as const,
  transferAccount: (date: string) =>
    [...outgoingPaymentKeys.all, "transfer-account", date] as const,
  list: (params: OutgoingPaymentListParams) =>
    [...outgoingPaymentKeys.all, "list", params] as const,
};

export const outgoingPaymentQueries = {
  detail: (docNum: string) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.detail.gcTime,
      queryFn: () => outgoingPaymentAPI.getOutgoingPayment(docNum),
      queryKey: outgoingPaymentKeys.detailByDocNum(docNum),
      staleTime: QUERY_CACHE_POLICY.detail.staleTime,
    }),
  detailByDocNum: (docNum: string) =>
    queryOptions({
      queryFn: () => outgoingPaymentAPI.getOutgoingPayment(docNum),
      queryKey: outgoingPaymentKeys.detailByDocNum(docNum),
      staleTime: 5 * 60 * 1000,
    }),
  docNumSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => outgoingPaymentAPI.getOutgoingPaymentDocNums(search, limit),
      queryKey: outgoingPaymentKeys.docNumSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  accountSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => outgoingPaymentAPI.getOutgoingPaymentAccounts(search, limit),
      queryKey: outgoingPaymentKeys.accountSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  bankSuggestions: (search?: string, limit?: number) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => outgoingPaymentAPI.getBankDetails(search, limit),
      queryKey: outgoingPaymentKeys.bankSuggestions(search, limit),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  list: (params: OutgoingPaymentListParams) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      placeholderData: keepPreviousData,
      queryFn: () => outgoingPaymentAPI.getOutgoingPayments(params),
      queryKey: outgoingPaymentKeys.list(params),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
    }),
  transferAccount: (date: string) =>
    queryOptions({
      gcTime: QUERY_CACHE_POLICY.tableList.gcTime,
      queryFn: () => outgoingPaymentAPI.resolveTransferAccount(date),
      queryKey: outgoingPaymentKeys.transferAccount(date),
      staleTime: QUERY_CACHE_POLICY.tableList.staleTime,
      enabled: !!date,
    }),
};
