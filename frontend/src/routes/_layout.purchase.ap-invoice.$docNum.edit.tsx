import { createFileRoute } from '@tanstack/react-router'

import { CreatePageRouteSkeleton } from '@/components/skeleton/create-page-route-skeleton'
import { APInvoiceCreate } from '@/features/create-pages/ap-invoice-create/components/ap-invoice-create'
import { apInvoiceQueries } from '@/features/table-pages/ap-invoices/api/ap-invoice.queries'
import { requireActiveSession } from '@/routes/_require-active-session'

/** PurchaseAPInvoiceEditRoute: Page for editing existing AP Invoices. */
export const Route = createFileRoute('/_layout/purchase/ap-invoice/$docNum/edit')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(apInvoiceQueries.detailByDocNum(params.docNum)),
  pendingMs: 0,
  pendingComponent: CreatePageRouteSkeleton,
  component: RouteComponent,
})

function RouteComponent() {
  const { docNum } = Route.useParams()
  return <APInvoiceCreate mode="edit" docNum={docNum} />
}
