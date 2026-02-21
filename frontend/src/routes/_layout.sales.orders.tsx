import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { TableSkeleton } from '@/components/skeleton/Table-skeleton'
import { salesOrderSearchSchema } from '@/features/table-pages/sales-orders/schemas/sales-order-search.schema'

const SalesOrderTable = lazy(() =>
  import('@/features/table-pages/sales-orders/components/sales-order-table').then((module) => ({
    default: module.SalesOrderTable,
  })),
)

/**
 * SalesOrdersRoute: Main listing for sales document management.
 * Enforces grid-state validation via shared search schema patterns.
 */
export const Route = createFileRoute('/_layout/sales/orders')({
  validateSearch: (search) => salesOrderSearchSchema.parse(search),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <SalesOrderTable />
      </Suspense>
    </div>
  )
}
