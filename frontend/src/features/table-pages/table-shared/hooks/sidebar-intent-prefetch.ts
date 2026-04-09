import { type QueryClient } from '@tanstack/react-query'

import { apCreditMemoQueries } from '@/features/table-pages/ap-credit-memo/api/ap-credit-memo.queries'
import { apInvoiceQueries } from '@/features/table-pages/ap-invoices/api/ap-invoice.queries'
import { arCreditNoteQueries } from '@/features/table-pages/ar-credit-note/api/ar-credit-note.queries'
import { arInvoiceQueries } from '@/features/table-pages/ar-invoices/api/ar-invoice.queries'
import { grpoQueries } from '@/features/table-pages/grpo/api/grpo.queries'
import { incomingPaymentQueries } from '@/features/table-pages/incoming-payment/api/incoming-payment.queries'
import { outgoingPaymentQueries } from '@/features/table-pages/outgoing-payment/api/outgoing-payment.queries'
import { purchaseOrderQueries } from '@/features/table-pages/purchase-orders/api/purchase-order.queries'
import { salesOrderQueries } from '@/features/table-pages/sales-orders/api/sales-order.queries'
import { salesQuotationQueries } from '@/features/table-pages/sales-quotations/api/sales-quotation.queries'
import { runSmartPrefetch } from '@/features/table-pages/table-shared/hooks/prefetch-orchestrator'

export type TableRoutePath =
  | '/purchase/orders'
  | '/purchase/grpo'
  | '/purchase/ap-invoice'
  | '/purchase/ap-credit-memo'
  | '/purchase/outgoing-payment'
  | '/sales/quotations'
  | '/sales/orders'
  | '/sales/ar-invoice'
  | '/sales/ar-credit-note'
  | '/sales/incoming-payment'

const DEFAULT_TABLE_PARAMS = {
  page: 1,
  limit: 10,
}

export const prefetchTableRouteIntent = (queryClient: QueryClient, routePath: TableRoutePath) => {
  const queryOptionsByPath = {
    '/purchase/orders': purchaseOrderQueries.list(DEFAULT_TABLE_PARAMS),
    '/purchase/grpo': grpoQueries.list(DEFAULT_TABLE_PARAMS),
    '/purchase/ap-invoice': apInvoiceQueries.list(DEFAULT_TABLE_PARAMS),
    '/purchase/ap-credit-memo': apCreditMemoQueries.list(DEFAULT_TABLE_PARAMS),
    '/purchase/outgoing-payment': outgoingPaymentQueries.list(DEFAULT_TABLE_PARAMS),
    '/sales/quotations': salesQuotationQueries.list(DEFAULT_TABLE_PARAMS),
    '/sales/orders': salesOrderQueries.list(DEFAULT_TABLE_PARAMS),
    '/sales/ar-invoice': arInvoiceQueries.list(DEFAULT_TABLE_PARAMS),
    '/sales/ar-credit-note': arCreditNoteQueries.list(DEFAULT_TABLE_PARAMS),
    '/sales/incoming-payment': incomingPaymentQueries.list(DEFAULT_TABLE_PARAMS),
  }

  void runSmartPrefetch(
    queryClient,
    queryOptionsByPath[routePath] as unknown as Parameters<typeof runSmartPrefetch>[1],
  )
}
