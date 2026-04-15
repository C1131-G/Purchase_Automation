import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { TableSkeleton } from '@/components/skeleton/Table-skeleton'
import { ArCreditMemoSearchSchema } from '@/features/table-pages/ar-credit-memo/schemas/ar-credit-memo-search.schema'

const ArCreditMemoTable = lazy(() =>
  import('@/features/table-pages/ar-credit-memo/components/ar-credit-memo-table').then(
    (module) => ({
      default: module.ArCreditMemoTable,
    }),
  ),
)

/**
 * ArCreditMemoRoute: Sales return document management.
 * Validates grid state via URL search schema for consistent views.
 */
export const Route = createFileRoute('/_layout/sales/ar-credit-memo')({
  validateSearch: (search) => ArCreditMemoSearchSchema.parse(search),
  component: RouteComponent,
})

function RouteComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isSubRoute =
    pathname === '/sales/ar-credit-memo/select-invoice' ||
    pathname === '/sales/ar-credit-memo/create' ||
    (pathname.startsWith('/sales/ar-credit-memo/') && pathname.endsWith('/edit'))

  if (isSubRoute) {
    return <Outlet />
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <ArCreditMemoTable />
      </Suspense>
    </div>
  )
}
