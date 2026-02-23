import { createFileRoute } from '@tanstack/react-router'

import { CreatePageRouteSkeleton } from '@/components/skeleton/create-page-route-skeleton'
import { requireActiveSession } from '@/routes/_require-active-session'

/** SalesIncomingPaymentCreateRoute: Page for creating new Incoming Payments. */
export const Route = createFileRoute('/_layout/sales/create-incoming-payment')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  pendingMs: 0,
  pendingComponent: CreatePageRouteSkeleton,
  component: RouteComponent,
})

function RouteComponent() {
  return <div className="p-6">Create Incoming Payment Page (Coming Soon)</div>
}
