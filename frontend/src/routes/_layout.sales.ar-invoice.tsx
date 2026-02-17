import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { TableSkeleton } from '@/components/skeleton/Table-skeleton'
import { arInvoiceSearchSchema } from '@/features/table-pages/ar-invoices/schemas/ar-invoice-search.schema'

const ARInvoiceTable = lazy(() =>
  import('@/features/table-pages/ar-invoices/components/ar-invoice-table').then((module) => ({
    default: module.ARInvoiceTable,
  })),
)

export const Route = createFileRoute('/_layout/sales/ar-invoice')({
  validateSearch: (search) => arInvoiceSearchSchema.parse(search),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <ARInvoiceTable />
      </Suspense>
    </div>
  )
}
