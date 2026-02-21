import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { TableSkeleton } from '@/components/skeleton/Table-skeleton'
import { apCreditNoteSearchSchema } from '@/features/table-pages/ap-credit-note/schemas/ap-credit-note-search.schema'

const APCreditNoteTable = lazy(() =>
  import('@/features/table-pages/ap-credit-note/components/ap-credit-note-table').then(
    (module) => ({
      default: module.APCreditNoteTable,
    }),
  ),
)

/**
 * APCreditNoteRoute: Procurement return documents listing.
 * Orchestrates grid state persistence via URL serialization.
 */
export const Route = createFileRoute('/_layout/purchase/ap-credit-note')({
  validateSearch: (search) => apCreditNoteSearchSchema.parse(search),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <APCreditNoteTable />
      </Suspense>
    </div>
  )
}
