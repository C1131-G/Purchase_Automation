import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { TableSkeleton } from '@/components/skeleton/Table-skeleton'
import { arCreditNoteSearchSchema } from '@/features/table-pages/ar-credit-note/schemas/ar-credit-note-search.schema'

const ARCreditNoteTable = lazy(() =>
  import('@/features/table-pages/ar-credit-note/components/ar-credit-note-table').then(
    (module) => ({
      default: module.ARCreditNoteTable,
    }),
  ),
)

export const Route = createFileRoute('/_layout/sales/ar-credit-note')({
  validateSearch: (search) => arCreditNoteSearchSchema.parse(search),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={<TableSkeleton />}>
        <ARCreditNoteTable />
      </Suspense>
    </div>
  )
}
