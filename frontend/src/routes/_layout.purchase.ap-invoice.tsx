import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { TableSkeleton } from '@/components/skeleton/Table-skeleton'
import { apInvoiceSearchSchema } from '@/features/table-pages/ap-invoices/schemas/ap-invoice-search.schema'

const APInvoiceTable = lazy(() =>
  import('@/features/table-pages/ap-invoices/components/ap-invoice-table').then((module) => ({
    default: module.APInvoiceTable,
  })),
)

export const Route = createFileRoute('/_layout/purchase/ap-invoice')({
  validateSearch: (search) => apInvoiceSearchSchema.parse(search),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <APInvoiceTable />
      </Suspense>
    </div>
  )
}
