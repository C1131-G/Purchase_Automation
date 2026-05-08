import type { QueryClient } from "@tanstack/react-query";

import { purchaseOrderQueries } from "@/features/table-pages/purchase-orders/api/purchase-order.queries";

const defaultTableParams = {
  limit: 10,
  page: 1,
};

export const prefetchTableDataAfterLogin = async (queryClient: QueryClient) => {
  await queryClient.prefetchQuery(purchaseOrderQueries.list(defaultTableParams));
};
