import { createFileRoute } from '@tanstack/react-router'

import { CreatePageRouteSkeleton } from '@/components/skeleton/create-page-route-skeleton'
import { requireActiveSession } from '@/routes/_require-active-session'

/** PurchaseAPCreditNoteCreateRoute: Page for creating new AP Credit Notes. */
export const Route = createFileRoute('/_layout/purchase/create-ap-credit-note')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  pendingMs: 0,
  pendingComponent: CreatePageRouteSkeleton,
  component: RouteComponent,
})

function RouteComponent() {
  return <div className="p-6">Create AP Credit Note Page (Coming Soon)</div>
}
