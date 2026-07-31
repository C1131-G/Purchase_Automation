import type { QueryClient } from "@tanstack/react-query";

import {
  prefetchCreateMasterData,
  type CreateMasterParty,
} from "@/features/create-pages/create-shared/utils/ensure-create-master-data";
import { icRfqQueries } from "@/features/intercompany/api/intercompany.queries";
import { apCreditMemoQueries } from "@/features/table-pages/ap-credit-memo/api/ap-credit-memo.queries";
import { apInvoiceQueries } from "@/features/table-pages/ap-invoices/api/ap-invoice.queries";
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
  | "/sales/request-for-quotations";

const DEFAULT_TABLE_PARAMS = {
  limit: 10,
  page: 1,
};

const partyForTableRoute = (routePath: TableRoutePath): CreateMasterParty =>
  routePath.startsWith("/sales") ? "customers" : "vendors";

/**
 * Prefetch first table page for the sidebar target (smart/orchestrated).
 * Also warms create master lookups — the same nav item opens create routes.
 * RFQ has no create form from this nav item, so skip master warmup for it.
 */
export const prefetchTableRouteIntent = (queryClient: QueryClient, routePath: TableRoutePath) => {
  const queryOptionsByPath = {
    "/purchase/ap-credit-memo": apCreditMemoQueries.list(DEFAULT_TABLE_PARAMS),
    "/purchase/ap-invoice": apInvoiceQueries.list(DEFAULT_TABLE_PARAMS),
    "/purchase/grpo": grpoQueries.list(DEFAULT_TABLE_PARAMS),
    "/purchase/orders": purchaseOrderQueries.list(DEFAULT_TABLE_PARAMS),
    "/purchase/quotations": purchaseQuotationQueries.list(DEFAULT_TABLE_PARAMS),
    "/purchase/outgoing-payment": outgoingPaymentQueries.list(DEFAULT_TABLE_PARAMS),
    "/sales/quotations": salesQuotationQueries.list(DEFAULT_TABLE_PARAMS),
    "/sales/request-for-quotations": icRfqQueries.list(),
  };

  void runSmartPrefetch(
    queryClient,
    queryOptionsByPath[routePath] as unknown as Parameters<typeof runSmartPrefetch>[1],
  );

  if (routePath !== "/sales/request-for-quotations") {
    prefetchCreateMasterData(queryClient, partyForTableRoute(routePath));
  }
};
