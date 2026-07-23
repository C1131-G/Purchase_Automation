import type { QueryClient } from "@tanstack/react-query";

import { apCreditMemoQueries } from "@/features/table-pages/ap-credit-memo/api/ap-credit-memo.queries";
import { apInvoiceQueries } from "@/features/table-pages/ap-invoices/api/ap-invoice.queries";
import { arInvoiceQueries } from "@/features/table-pages/ar-invoices/api/ar-invoice.queries";
import { grpoQueries } from "@/features/table-pages/grpo/api/grpo.queries";
import { outgoingPaymentQueries } from "@/features/table-pages/outgoing-payment/api/outgoing-payment.queries";
import { purchaseOrderQueries } from "@/features/table-pages/purchase-orders/api/purchase-order.queries";
import { purchaseQuotationQueries } from "@/features/table-pages/purchase-quotations/api/purchase-quotation.queries";
import { salesQuotationQueries } from "@/features/table-pages/sales-quotations/api/sales-quotation.queries";
import { runSmartPrefetch } from "@/features/table-pages/table-shared/hooks/prefetch-orchestrator";

export type TableRoutePath =
  | "/purchase/orders"
  | "/purchase/quotations"
  | "/purchase/grpo"
  | "/purchase/ap-invoice"
  | "/purchase/ap-credit-memo"
  | "/purchase/outgoing-payment"
  | "/sales/quotations"
  | "/sales/ar-invoice";

const DEFAULT_TABLE_PARAMS = {
  limit: 10,
  page: 1,
};

export const prefetchTableRouteIntent = (queryClient: QueryClient, routePath: TableRoutePath) => {
  const queryOptionsByPath = {
    "/purchase/ap-credit-memo": apCreditMemoQueries.list(DEFAULT_TABLE_PARAMS),
    "/purchase/ap-invoice": apInvoiceQueries.list(DEFAULT_TABLE_PARAMS),
    "/purchase/grpo": grpoQueries.list(DEFAULT_TABLE_PARAMS),
    "/purchase/orders": purchaseOrderQueries.list(DEFAULT_TABLE_PARAMS),
    "/purchase/quotations": purchaseQuotationQueries.list(DEFAULT_TABLE_PARAMS),
    "/purchase/outgoing-payment": outgoingPaymentQueries.list(DEFAULT_TABLE_PARAMS),
    "/sales/ar-invoice": arInvoiceQueries.list(DEFAULT_TABLE_PARAMS),
    "/sales/quotations": salesQuotationQueries.list(DEFAULT_TABLE_PARAMS),
  };

  void runSmartPrefetch(
    queryClient,
    queryOptionsByPath[routePath] as unknown as Parameters<typeof runSmartPrefetch>[1],
  );
};
