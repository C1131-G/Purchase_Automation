import { type QueryClient } from '@tanstack/react-query'

import { createSharedQueries } from '@/features/create-pages/create-shared/api/create-shared.queries'
import { apCreditNoteQueries } from '@/features/table-pages/ap-credit-note/api/ap-credit-note.queries'
import { apInvoiceQueries } from '@/features/table-pages/ap-invoices/api/ap-invoice.queries'
import { arCreditNoteQueries } from '@/features/table-pages/ar-credit-note/api/ar-credit-note.queries'
import { arInvoiceQueries } from '@/features/table-pages/ar-invoices/api/ar-invoice.queries'
import { grpoQueries } from '@/features/table-pages/grpo/api/grpo.queries'
import { incomingPaymentQueries } from '@/features/table-pages/incoming-payment/api/incoming-payment.queries'
import { outgoingPaymentQueries } from '@/features/table-pages/outgoing-payment/api/outgoing-payment.queries'
import { purchaseOrderQueries } from '@/features/table-pages/purchase-orders/api/purchase-order.queries'
import { salesOrderQueries } from '@/features/table-pages/sales-orders/api/sales-order.queries'

const defaultTableParams = {
  page: 1,
  limit: 10,
}

export const prefetchTableDataAfterLogin = async (queryClient: QueryClient) => {
  // Ensure PO table is ready first for the immediate post-login route.
  await queryClient.prefetchQuery(purchaseOrderQueries.list(defaultTableParams))

  // After PO is ready, do remaining warmups fully in background.
  void (async () => {
    // Step 1: PO doc number + purchase code/name.
    await Promise.allSettled([
      queryClient.prefetchQuery(purchaseOrderQueries.docNumSuggestions()),
      queryClient.prefetchQuery(createSharedQueries.vendors()),
    ])

    // Step 2: Sales table + sales doc number + sales code/name.
    await Promise.allSettled([
      queryClient.prefetchQuery(salesOrderQueries.list(defaultTableParams)),
      queryClient.prefetchQuery(salesOrderQueries.docNumSuggestions()),
      queryClient.prefetchQuery(createSharedQueries.customers()),
    ])

    // Step 3: Remaining tables/docnums + create dependencies.
    await Promise.allSettled([
      queryClient.prefetchQuery(grpoQueries.list(defaultTableParams)),
      queryClient.prefetchQuery(grpoQueries.docNumSuggestions()),
      queryClient.prefetchQuery(apInvoiceQueries.list(defaultTableParams)),
      queryClient.prefetchQuery(apInvoiceQueries.docNumSuggestions()),
      queryClient.prefetchQuery(apCreditNoteQueries.list(defaultTableParams)),
      queryClient.prefetchQuery(apCreditNoteQueries.docNumSuggestions()),
      queryClient.prefetchQuery(outgoingPaymentQueries.list(defaultTableParams)),
      queryClient.prefetchQuery(outgoingPaymentQueries.docNumSuggestions()),
      queryClient.prefetchQuery(arInvoiceQueries.list(defaultTableParams)),
      queryClient.prefetchQuery(arInvoiceQueries.docNumSuggestions()),
      queryClient.prefetchQuery(arCreditNoteQueries.list(defaultTableParams)),
      queryClient.prefetchQuery(arCreditNoteQueries.docNumSuggestions()),
      queryClient.prefetchQuery(incomingPaymentQueries.list(defaultTableParams)),
      queryClient.prefetchQuery(incomingPaymentQueries.docNumSuggestions()),
      queryClient.prefetchQuery(createSharedQueries.warehouses()),
      queryClient.prefetchQuery(createSharedQueries.salesEmployees()),
    ])
  })()
}
