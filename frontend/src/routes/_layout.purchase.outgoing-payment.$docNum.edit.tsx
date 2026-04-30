import { createFileRoute } from '@tanstack/react-router'

import { OutgoingPaymentEditSkeleton } from '@/components/skeleton/outgoing-payment-edit-skeleton'
import { OutgoingPaymentEdit } from '@/features/create-pages/outgoing-payment-create/components/outgoing-payment-edit'
import { requireActiveSession } from '@/routes/_require-active-session'

export const Route = createFileRoute('/_layout/purchase/outgoing-payment/$docNum/edit')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  pendingMs: 0,
  pendingComponent: OutgoingPaymentEditSkeleton,
  component: OutgoingPaymentEditPage,
})

function OutgoingPaymentEditPage() {
  const { docNum } = Route.useParams()
  return <OutgoingPaymentEdit docNum={docNum} />
}
