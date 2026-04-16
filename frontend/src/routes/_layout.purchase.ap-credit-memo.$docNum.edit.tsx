import { createFileRoute } from '@tanstack/react-router'

import { CreatePageRouteSkeleton } from '@/components/skeleton/create-page-route-skeleton'
import APCreditMemoCreate from '@/features/create-pages/ap-credit-memo-create/components/ap-credit-memo-create'
import { requireActiveSession } from '@/routes/_require-active-session'

/** PurchaseAPCreditMemoEditRoute: Page for editing existing AP Credit Memos. */
export const Route = createFileRoute('/_layout/purchase/ap-credit-memo/$docNum/edit')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  pendingComponent: CreatePageRouteSkeleton,
  component: RouteComponent,
})

function RouteComponent() {
  const { docNum } = Route.useParams()
  return <APCreditMemoCreate mode="edit" docNum={docNum} />
}
