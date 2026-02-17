import { createFileRoute } from '@tanstack/react-router'

import { requireActiveSession } from '@/routes/_require-active-session'

export const Route = createFileRoute('/_layout/purchase/create-ap-credit-note')({
  beforeLoad: async () => {
    await requireActiveSession()
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div className="p-6">Create AP Credit Note Page (Coming Soon)</div>
}
