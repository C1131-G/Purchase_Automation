import type { QueryClient } from "@tanstack/react-query";

import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { apCreditMemoQueries } from "@/features/table-pages/ap-credit-memo/api/ap-credit-memo.queries";
import { apInvoiceQueries } from "@/features/table-pages/ap-invoices/api/ap-invoice.queries";
import { arInvoiceQueries } from "@/features/table-pages/ar-invoices/api/ar-invoice.queries";
import { grpoQueries } from "@/features/table-pages/grpo/api/grpo.queries";
import { incomingPaymentQueries } from "@/features/table-pages/incoming-payment/api/incoming-payment.queries";
import { outgoingPaymentQueries } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.queries";
import { purchaseOrderQueries } from "@/features/table-pages/purchase-orders/api/purchase-order.queries";
import { purchaseQuotationQueries } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.queries";
import { salesQuotationQueries } from "@/features/table-pages/sales-quotations/api/sales-quotation.queries";

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const defaultTableParams = {
  limit: 10,
  page: 1,
};

const docNumQuickLimit = 10;
const backgroundBatchSize = 4;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const prefetchQuery = (queryClient: QueryClient, queryOptions: unknown) =>
  queryClient.prefetchQuery(queryOptions as never);

const prefetchQueryBatch = async (queryClient: QueryClient, queries: unknown[]) => {
  for (let index = 0; index < queries.length; index += backgroundBatchSize) {
    const batch = queries.slice(index, index + backgroundBatchSize);
    await Promise.allSettled(batch.map((queryOptions) => prefetchQuery(queryClient, queryOptions)));
  }
};

/**
 * scheduleIdlePrefetch: Run a task when the browser is idle.
 * Falls back to setTimeout on browsers without requestIdleCallback.
 * Exported so callers (e.g. use-login) can schedule the full warmup
 * after navigation has already committed.
 */
export const scheduleIdlePrefetch = (task: () => Promise<void>) => {
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

// ---------------------------------------------------------------------------
// Background (deferred) prefetches — run during idle time after first paint.
//
// Dashboard queries are intentionally NOT included here. The DashboardCanvas
// component owns its own queries and fires them on mount with normal skeletons.
// Prefetching them from the login handler races with session establishment and
// causes 401s on the backend before the auth guard has had a chance to run.
// ---------------------------------------------------------------------------

const backgroundPrefetches = [
  purchaseQuotationQueries.list(defaultTableParams),
  purchaseQuotationQueries.docNumSuggestions(undefined, docNumQuickLimit),
  purchaseOrderQueries.list(defaultTableParams),
  purchaseOrderQueries.docNumSuggestions(undefined, docNumQuickLimit),
  createSharedQueries.customers(),
  createSharedQueries.salesEmployees(),
  createSharedQueries.taxCodes(),
  createSharedQueries.vendors(),
  createSharedQueries.warehouses(),
  apCreditMemoQueries.list(defaultTableParams),
  apCreditMemoQueries.docNumSuggestions(undefined, docNumQuickLimit),
  apInvoiceQueries.list(defaultTableParams),
  apInvoiceQueries.docNumSuggestions(undefined, docNumQuickLimit),
  arInvoiceQueries.list(defaultTableParams),
  arInvoiceQueries.docNumSuggestions(undefined, docNumQuickLimit),
  grpoQueries.list(defaultTableParams),
  grpoQueries.docNumSuggestions(undefined, docNumQuickLimit),
  incomingPaymentQueries.list(defaultTableParams),
  incomingPaymentQueries.docNumSuggestions(undefined, docNumQuickLimit),
  outgoingPaymentQueries.list(defaultTableParams),
  outgoingPaymentQueries.docNumSuggestions(undefined, docNumQuickLimit),
  salesQuotationQueries.list(defaultTableParams),
  salesQuotationQueries.docNumSuggestions(undefined, docNumQuickLimit),
];

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * prefetchTableDataAfterLogin
 *
 * Warms table lists, doc-num suggestion caches, and master-data in the
 * background during idle time so they are ready before the user navigates
 * to any table page. Intentionally deferred — this must not compete with
 * the dashboard's own first-paint queries.
 */
export const prefetchTableDataAfterLogin = async (queryClient: QueryClient) => {
  const warmupStart = Date.now();
  await prefetchQueryBatch(queryClient, backgroundPrefetches);
  // eslint-disable-next-line no-console
  console.debug(`[perf] background table warmup complete: ${Date.now() - warmupStart}ms`);
};
