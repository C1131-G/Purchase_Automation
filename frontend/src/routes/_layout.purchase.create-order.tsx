import { createFileRoute } from '@tanstack/react-router'

import { PurchaseOrderCreate } from '@/features/create-pages/purchase-order-create/components/purchase-order-create'
import { requireActiveSession } from '@/routes/_require-active-session'

export const Route = createFileRoute('/_layout/purchase/create-order')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  component: PurchaseOrderCreate,
})
