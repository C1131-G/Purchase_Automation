import { createFileRoute } from '@tanstack/react-router'

import { requireActiveSession } from '@/routes/_require-active-session'

/** SalesARInvoiceCreateRoute: Page for creating new AR Invoices. */
export const Route = createFileRoute('/_layout/sales/create-ar-invoice')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div className="p-6">Create AR Invoice Page (Coming Soon)</div>
}
