import { createFileRoute } from '@tanstack/react-router'

import { requireActiveSession } from '@/routes/_require-active-session'

/** PurchaseOutgoingPaymentCreateRoute: Page for creating new Outgoing Payments. */
export const Route = createFileRoute('/_layout/purchase/create-outgoing-payment')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div className="p-6">Create Outgoing Payment Page (Coming Soon)</div>
}
