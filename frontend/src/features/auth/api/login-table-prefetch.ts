import type { QueryClient } from "@tanstack/react-query";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { apCreditMemoQueries } from "@/features/table-pages/ap-credit-memo/api/ap-credit-memo.queries";
import { apInvoiceQueries } from "@/features/table-pages/ap-invoices/api/ap-invoice.queries";
import { arCreditMemoQueries } from "@/features/table-pages/ar-credit-memo/api/ar-credit-memo.queries";
import { arInvoiceQueries } from "@/features/table-pages/ar-invoices/api/ar-invoice.queries";
import { grpoQueries } from "@/features/table-pages/grpo/api/grpo.queries";
import { incomingPaymentQueries } from "@/features/table-pages/incoming-payment/api/incoming-payment.queries";
import { outgoingPaymentQueries } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.queries";
import { purchaseOrderQueries } from "@/features/table-pages/purchase-orders/api/purchase-order.queries";
import { purchaseQuotationQueries } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.queries";
import { salesOrderQueries } from "@/features/table-pages/sales-orders/api/sales-order.queries";
import { salesQuotationQueries } from "@/features/table-pages/sales-quotations/api/sales-quotation.queries";

const defaultTableParams = {
  limit: 10,
  page: 1,
};

const docNumQuickLimit = 10;
const backgroundBatchSize = 4;

const prefetchQuery = (queryClient: QueryClient, queryOptions: unknown) =>
  queryClient.prefetchQuery(queryOptions as never);

const prefetchQueryBatch = async (queryClient: QueryClient, queries: unknown[]) => {
  for (let index = 0; index < queries.length; index += backgroundBatchSize) {
    const batch = queries.slice(index, index + backgroundBatchSize);
    await Promise.allSettled(batch.map((queryOptions) => prefetchQuery(queryClient, queryOptions)));
  }
};

const scheduleIdlePrefetch = (task: () => Promise<void>) => {
  if (typeof window === "undefined") {
    void task();
    return;
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(
      () => {
        void task();
      },
      {
        timeout: 2000,
      },
    );
    return;
  }

  globalThis.setTimeout(() => {
    void task();
  }, 0);
};

const immediatePrefetches = [
  purchaseQuotationQueries.list(defaultTableParams),
  purchaseQuotationQueries.docNumSuggestions(undefined, docNumQuickLimit),
  createSharedQueries.customers(),
  createSharedQueries.salesEmployees(),
  createSharedQueries.taxCodes(),
  createSharedQueries.vendors(),
  createSharedQueries.warehouses(),
];

const backgroundPrefetches = [
  apCreditMemoQueries.list(defaultTableParams),
  apCreditMemoQueries.docNumSuggestions(undefined, docNumQuickLimit),
  apInvoiceQueries.list(defaultTableParams),
  apInvoiceQueries.docNumSuggestions(undefined, docNumQuickLimit),
  arCreditMemoQueries.list(defaultTableParams),
  arCreditMemoQueries.docNumSuggestions(undefined, docNumQuickLimit),
  arInvoiceQueries.list(defaultTableParams),
  arInvoiceQueries.docNumSuggestions(undefined, docNumQuickLimit),
  grpoQueries.list(defaultTableParams),
  grpoQueries.docNumSuggestions(undefined, docNumQuickLimit),
  incomingPaymentQueries.list(defaultTableParams),
  incomingPaymentQueries.docNumSuggestions(undefined, docNumQuickLimit),
  outgoingPaymentQueries.list(defaultTableParams),
  outgoingPaymentQueries.docNumSuggestions(undefined, docNumQuickLimit),
  purchaseOrderQueries.list(defaultTableParams),
  purchaseOrderQueries.docNumSuggestions(undefined, docNumQuickLimit),
  salesOrderQueries.list(defaultTableParams),
  salesOrderQueries.docNumSuggestions(undefined, docNumQuickLimit),
  salesQuotationQueries.list(defaultTableParams),
  salesQuotationQueries.docNumSuggestions(undefined, docNumQuickLimit),
];

export const prefetchTableDataAfterLogin = async (queryClient: QueryClient) => {
  await prefetchQueryBatch(queryClient, immediatePrefetches);

  scheduleIdlePrefetch(async () => {
    await prefetchQueryBatch(queryClient, backgroundPrefetches);
  });
};
