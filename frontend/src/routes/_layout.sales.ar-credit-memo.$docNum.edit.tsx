import { createFileRoute } from '@tanstack/react-router'

import { ArCreditMemoCreate } from '@/features/create-pages/ar-credit-memo-create/components/ar-credit-memo-create'
import { requireActiveSession } from '@/routes/_require-active-session'

export const Route = createFileRoute('/_layout/sales/ar-credit-memo/$docNum/edit')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  component: ArCreditMemoEditPage,
})

function ArCreditMemoEditPage() {
  const { docNum } = Route.useParams()
  return <ArCreditMemoCreate mode="edit" docNum={docNum} />
}
