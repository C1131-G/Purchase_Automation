import { createFileRoute } from '@tanstack/react-router'

import { CreatePageRouteSkeleton } from '@/components/skeleton/create-page-route-skeleton'
import { requireActiveSession } from '@/routes/_require-active-session'
import { APInvoiceCreate } from '@/features/create-pages/ap-invoice-create/components/ap-invoice-create'

/** PurchaseAPInvoiceEditRoute: Page for editing existing AP Invoices. */
export const Route = createFileRoute('/_layout/purchase/ap-invoice/$docNum/edit')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  pendingMs: 0,
  pendingComponent: CreatePageRouteSkeleton,
  component: RouteComponent,
})

function RouteComponent() {
  const { docNum } = Route.useParams()
  return <APInvoiceCreate mode="edit" docNum={docNum} />
}
