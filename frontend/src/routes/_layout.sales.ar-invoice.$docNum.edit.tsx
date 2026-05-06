import { createFileRoute } from '@tanstack/react-router'

import { CreatePageRouteSkeleton } from '@/components/skeleton/create-page-route-skeleton'
import { ARInvoiceCreate } from '@/features/create-pages/ar-invoice-create/components/ar-invoice-create'
import { arInvoiceQueries } from '@/features/table-pages/ar-invoices/api/ar-invoice.queries'
import { requireActiveSession } from '@/routes/_require-active-session'

export const Route = createFileRoute('/_layout/sales/ar-invoice/$docNum/edit')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(arInvoiceQueries.detailByDocNum(params.docNum)),
  pendingComponent: CreatePageRouteSkeleton,
  component: ARInvoiceEditPage,
})

function ARInvoiceEditPage() {
  const { docNum } = Route.useParams()
  return <ARInvoiceCreate mode="edit" docNum={docNum} />
}
