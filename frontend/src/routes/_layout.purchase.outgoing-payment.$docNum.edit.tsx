import { createFileRoute } from '@tanstack/react-router'

import { OutgoingPaymentEditSkeleton } from '@/components/skeleton/outgoing-payment-edit-skeleton'
import { OutgoingPaymentEdit } from '@/features/create-pages/outgoing-payment-create/components/outgoing-payment-edit'
import { outgoingPaymentQueries } from '@/features/table-pages/outgoing-payment/api/outgoing-payment.queries'
import { requireActiveSession } from '@/routes/_require-active-session'

export const Route = createFileRoute('/_layout/purchase/outgoing-payment/$docNum/edit')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(outgoingPaymentQueries.detail(params.docNum)),
  pendingMs: 0,
  pendingComponent: OutgoingPaymentEditSkeleton,
  component: OutgoingPaymentEditPage,
})

function OutgoingPaymentEditPage() {
  const { docNum } = Route.useParams()
  return <OutgoingPaymentEdit docNum={docNum} />
}
