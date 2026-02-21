import { createFileRoute } from '@tanstack/react-router'

import { requireActiveSession } from '@/routes/_require-active-session'

/** PurchaseAPInvoiceCreateRoute: Page for creating new AP Invoices. */
export const Route = createFileRoute('/_layout/purchase/create-ap-invoice')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div className="p-6">Create AP Invoice Page (Coming Soon)</div>
}
