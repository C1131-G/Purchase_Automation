import { createFileRoute } from '@tanstack/react-router'

import { CreatePageRouteSkeleton } from '@/components/skeleton/create-page-route-skeleton'
import { GRPOCreate } from '@/features/create-pages/grpo-create/components/grpo-create'
import { requireActiveSession } from '@/routes/_require-active-session'

export const Route = createFileRoute('/_layout/purchase/grpo/$docNum/edit')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  pendingMs: 0,
  pendingComponent: CreatePageRouteSkeleton,
  component: GRPOEditPage,
})

function GRPOEditPage() {
  const { docNum } = Route.useParams()
  return <GRPOCreate mode="edit" docNum={docNum} />
}
