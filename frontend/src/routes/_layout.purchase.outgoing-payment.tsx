import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { TableSkeleton } from '@/components/skeleton/Table-skeleton'
import { outgoingPaymentSearchSchema } from '@/features/table-pages/outgoing-payment/schemas/outgoing-payment-search.schema'

const OutgoingPaymentTable = lazy(() =>
  import('@/features/table-pages/outgoing-payment/components/outgoing-payment-table').then(
    (module) => ({
      default: module.OutgoingPaymentTable,
    }),
  ),
)

export const Route = createFileRoute('/_layout/purchase/outgoing-payment')({
  validateSearch: (search) => outgoingPaymentSearchSchema.parse(search),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <OutgoingPaymentTable />
      </Suspense>
    </div>
  )
}
