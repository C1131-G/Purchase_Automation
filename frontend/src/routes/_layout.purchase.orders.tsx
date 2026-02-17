import { createFileRoute } from '@tanstack/react-router'
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

export const Route = createFileRoute('/_layout/purchase/orders')({
  validateSearch: (search) => purchaseOrderSearchSchema.parse(search),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <PurchaseOrderTable />
      </Suspense>
    </div>
  )
}
