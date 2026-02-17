import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { TableSkeleton } from '@/components/skeleton/Table-skeleton'
import { grpoSearchSchema } from '@/features/table-pages/grpo/schemas/grpo-search.schema'

const GRPOTable = lazy(() =>
  import('@/features/table-pages/grpo/components/grpo-table').then((module) => ({
    default: module.GRPOTable,
  })),
)

export const Route = createFileRoute('/_layout/purchase/grpo')({
  validateSearch: (search) => grpoSearchSchema.parse(search),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <GRPOTable />
      </Suspense>
    </div>
  )
}
