import { type QueryClient } from '@tanstack/react-query'

import { purchaseOrderQueries } from '@/features/table-pages/purchase-orders/api/purchase-order.queries'

const defaultTableParams = {
  page: 1,
  limit: 10,
}

export const prefetchTableDataAfterLogin = async (queryClient: QueryClient) => {
  await queryClient.prefetchQuery(purchaseOrderQueries.list(defaultTableParams))
}
