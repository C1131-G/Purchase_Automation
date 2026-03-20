import { createFileRoute } from '@tanstack/react-router'

import { SalesQuotationCreate } from '@/features/create-pages/sales-quotation-create/components/sales-quotation-create'
import { requireActiveSession } from '@/routes/_require-active-session'

export const Route = createFileRoute('/_layout/sales/quotations/$docNum/edit')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  component: SalesQuotationEditPage,
})

function SalesQuotationEditPage() {
  const { docNum } = Route.useParams()
  return <SalesQuotationCreate mode="edit" docNum={docNum} />
}
