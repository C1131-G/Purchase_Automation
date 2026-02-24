import { createFileRoute } from '@tanstack/react-router'

import { ARInvoiceCreate } from '@/features/create-pages/ar-invoice-create/components/ar-invoice-create'
import { requireActiveSession } from '@/routes/_require-active-session'

export const Route = createFileRoute('/_layout/sales/ar-invoice/$docNum/edit')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  component: ARInvoiceEditPage,
})

function ARInvoiceEditPage() {
  const { docNum } = Route.useParams()
  return <ARInvoiceCreate mode="edit" docNum={docNum} />
}
