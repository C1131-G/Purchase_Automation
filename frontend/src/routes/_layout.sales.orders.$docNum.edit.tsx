import { createFileRoute } from '@tanstack/react-router'

import { SalesOrderCreate } from '@/features/create-pages/sales-order-create/components/sales-order-create'
import { requireActiveSession } from '@/routes/_require-active-session'

export const Route = createFileRoute('/_layout/sales/orders/$docNum/edit')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  component: SalesOrderEditPage,
})

function SalesOrderEditPage() {
  const { docNum } = Route.useParams()
  return <SalesOrderCreate mode="edit" docNum={docNum} />
}
