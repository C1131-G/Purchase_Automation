import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { TableSkeleton } from '@/components/skeleton/Table-skeleton'
import { salesQuotationSearchSchema } from '@/features/table-pages/sales-quotations/schemas/sales-quotation-search.schema'

const SalesQuotationTable = lazy(() =>
  import('@/features/table-pages/sales-quotations/components/sales-quotation-table').then(
    (module) => ({
      default: module.SalesQuotationTable,
    }),
  ),
)

export const Route = createFileRoute('/_layout/sales/quotations')({
  validateSearch: (search) => salesQuotationSearchSchema.parse(search),
  component: RouteComponent,
})

function RouteComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isEditRoute = pathname.startsWith('/sales/quotations/') && pathname.endsWith('/edit')

  if (isEditRoute) {
    return <Outlet />
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <SalesQuotationTable />
      </Suspense>
    </div>
  )
}
