import { createFileRoute } from '@tanstack/react-router'

import { IncomingPaymentEdit } from '@/features/create-pages/incoming-payment-create/components/incoming-payment-edit'
import { requireActiveSession } from '@/routes/_require-active-session'

export const Route = createFileRoute('/_layout/sales/incoming-payment/$docNum/edit')({
  beforeLoad: async () => {
    console.log('[_layout.sales.incoming-payment.$docNum.edit] beforeLoad triggered')
    await requireActiveSession()
    console.log(
      '[_layout.sales.incoming-payment.$docNum.edit] beforeLoad completed (session active)',
    )
  },
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
