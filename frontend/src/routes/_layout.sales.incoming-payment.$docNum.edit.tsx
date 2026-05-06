import { createFileRoute } from '@tanstack/react-router'

import { CreatePageRouteSkeleton } from '@/components/skeleton/create-page-route-skeleton'
import { IncomingPaymentEdit } from '@/features/create-pages/incoming-payment-create/components/incoming-payment-edit'
import { incomingPaymentQueries } from '@/features/table-pages/incoming-payment/api/incoming-payment.queries'
import { requireActiveSession } from '@/routes/_require-active-session'

export const Route = createFileRoute('/_layout/sales/incoming-payment/$docNum/edit')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(incomingPaymentQueries.detail(params.docNum)),
  pendingComponent: CreatePageRouteSkeleton,
  component: IncomingPaymentEditPage,
})

function IncomingPaymentEditPage() {
  const { docNum } = Route.useParams()
  console.log(
    '[_layout.sales.incoming-payment.$docNum.edit] Rendering IncomingPaymentEditPage for docNum:',
    docNum,
  )
  return <IncomingPaymentEdit docNum={docNum} />
}
