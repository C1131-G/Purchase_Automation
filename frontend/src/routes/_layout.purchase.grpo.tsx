import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { TableSkeleton } from '@/components/skeleton/Table-skeleton'
import { grpoSearchSchema } from '@/features/table-pages/grpo/schemas/grpo-search.schema'

const GRPOTable = lazy(() =>
  import('@/features/table-pages/grpo/components/grpo-table').then((module) => ({
    default: module.GRPOTable,
  })),
)

/**
 * PurchaseGRPORoute: Goods Receipt PO listing and management.
 * Synchronizes grid state with URL parameters for shareable views.
 */
export const Route = createFileRoute('/_layout/purchase/grpo')({
  validateSearch: (search) => grpoSearchSchema.parse(search),
  component: RouteComponent,
})

function RouteComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isEditRoute = pathname.startsWith('/purchase/grpo/') && pathname.endsWith('/edit')

  if (isEditRoute) {
    return <Outlet />
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <GRPOTable />
      </Suspense>
    </div>
  )
}
