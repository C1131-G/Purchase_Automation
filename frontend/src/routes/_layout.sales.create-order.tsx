import { createFileRoute } from '@tanstack/react-router'

import { SalesOrderCreate } from '@/features/create-pages/sales-order-create/components/sales-order-create'
import { requireActiveSession } from '@/routes/_require-active-session'

export const Route = createFileRoute('/_layout/sales/create-order')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  component: SalesOrderCreate,
})
