import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { TableSkeleton } from '@/components/skeleton/Table-skeleton'
import { purchaseOrderSearchSchema } from '@/features/table-pages/purchase-orders/schemas/purchase-order-search.schema'

const PurchaseOrderTable = lazy(() =>
  import('@/features/table-pages/purchase-orders/components/purchase-order-table').then(
    (module) => ({
      default: module.PurchaseOrderTable,
    }),
  ),
)

/**
 * PurchaseOrdersRoute: Main listing for procurement documents.
 * Validates grid state (pagination, sorting, filters) via URL search schema.
 */
export const Route = createFileRoute('/_layout/purchase/orders')({
  validateSearch: (search) => purchaseOrderSearchSchema.parse(search),
  component: RouteComponent,
})

function RouteComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isEditRoute = pathname.startsWith('/purchase/orders/') && pathname.endsWith('/edit')

  if (isEditRoute) {
    return <Outlet />
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <PurchaseOrderTable />
      </Suspense>
    </div>
  )
}
