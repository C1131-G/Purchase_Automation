import { createFileRoute } from '@tanstack/react-router'

import { CreatePageRouteSkeleton } from '@/components/skeleton/create-page-route-skeleton'
import { PurchaseOrderCreate } from '@/features/create-pages/purchase-order-create/components/purchase-order-create'
import { requireActiveSession } from '@/routes/_require-active-session'

export const Route = createFileRoute('/_layout/purchase/orders/$docNum/edit')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  pendingMs: 0,
  pendingComponent: CreatePageRouteSkeleton,
  component: PurchaseOrderEditPage,
})

function PurchaseOrderEditPage() {
  const { docNum } = Route.useParams()
  return <PurchaseOrderCreate mode="edit" docNum={docNum} />
}
