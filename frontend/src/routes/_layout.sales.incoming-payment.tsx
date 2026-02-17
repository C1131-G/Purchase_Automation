import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { TableSkeleton } from '@/components/skeleton/Table-skeleton'
import { incomingPaymentSearchSchema } from '@/features/table-pages/incoming-payment/schemas/incoming-payment-search.schema'

const IncomingPaymentTable = lazy(() =>
  import('@/features/table-pages/incoming-payment/components/incoming-payment-table').then(
    (module) => ({
      default: module.IncomingPaymentTable,
    }),
  ),
)

export const Route = createFileRoute('/_layout/sales/incoming-payment')({
  validateSearch: (search) => incomingPaymentSearchSchema.parse(search),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <IncomingPaymentTable />
      </Suspense>
    </div>
  )
}
