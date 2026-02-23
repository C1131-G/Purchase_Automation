import { createFileRoute } from '@tanstack/react-router'

import { CreatePageRouteSkeleton } from '@/components/skeleton/create-page-route-skeleton'
import { SalesOrderCreate } from '@/features/create-pages/sales-order-create/components/sales-order-create'
import { requireActiveSession } from '@/routes/_require-active-session'

export const Route = createFileRoute('/_layout/sales/orders/$docNum/edit')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  pendingMs: 0,
  pendingComponent: CreatePageRouteSkeleton,
  component: SalesOrderEditPage,
})

function SalesOrderEditPage() {
  const { docNum } = Route.useParams()
  return <SalesOrderCreate mode="edit" docNum={docNum} />
}
