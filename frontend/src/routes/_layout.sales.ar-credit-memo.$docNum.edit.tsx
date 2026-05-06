import { createFileRoute } from '@tanstack/react-router'

import { CreatePageRouteSkeleton } from '@/components/skeleton/create-page-route-skeleton'
import { ArCreditMemoCreate } from '@/features/create-pages/ar-credit-memo-create/components/ar-credit-memo-create'
import { arCreditMemoQueries } from '@/features/table-pages/ar-credit-memo/api/ar-credit-memo.queries'
import { requireActiveSession } from '@/routes/_require-active-session'

export const Route = createFileRoute('/_layout/sales/ar-credit-memo/$docNum/edit')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(arCreditMemoQueries.detailByDocNum(params.docNum)),
  pendingComponent: CreatePageRouteSkeleton,
  component: ArCreditMemoEditPage,
})

function ArCreditMemoEditPage() {
  const { docNum } = Route.useParams()
  return <ArCreditMemoCreate mode="edit" docNum={docNum} />
}
