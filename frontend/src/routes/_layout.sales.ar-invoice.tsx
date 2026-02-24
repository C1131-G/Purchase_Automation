import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { TableSkeleton } from '@/components/skeleton/Table-skeleton'
import { arInvoiceSearchSchema } from '@/features/table-pages/ar-invoices/schemas/ar-invoice-search.schema'

const ARInvoiceTable = lazy(() =>
  import('@/features/table-pages/ar-invoices/components/ar-invoice-table').then((module) => ({
    default: module.ARInvoiceTable,
  })),
)

/**
 * ARInvoiceRoute: Accounts Receivable Invoice listing.
 * Orchestrates grid state synchronization between UI elements and URL.
 */
export const Route = createFileRoute('/_layout/sales/ar-invoice')({
  validateSearch: (search) => arInvoiceSearchSchema.parse(search),
  component: RouteComponent,
})

function RouteComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isEditRoute = pathname.startsWith('/sales/ar-invoice/') && pathname.endsWith('/edit')

  if (isEditRoute) {
    return <Outlet />
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <ARInvoiceTable />
      </Suspense>
    </div>
  )
}
