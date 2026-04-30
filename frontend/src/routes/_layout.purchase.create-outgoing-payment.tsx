import { createFileRoute } from '@tanstack/react-router'

import { CreateOutgoingPaymentSkeleton } from '@/components/skeleton/create-outgoing-payment-skeleton'
import { requireActiveSession } from '@/routes/_require-active-session'

/** PurchaseOutgoingPaymentCreateRoute: Page for creating new Outgoing Payments. */
export const Route = createFileRoute('/_layout/purchase/create-outgoing-payment')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  pendingMs: 0,
  pendingComponent: CreateOutgoingPaymentSkeleton,
  component: RouteComponent,
})

import { CreateOutgoingPaymentForm } from '@/features/create-pages/outgoing-payment-create'

function RouteComponent() {
  return <CreateOutgoingPaymentForm />
}
