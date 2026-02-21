import { createFileRoute } from '@tanstack/react-router'

/** PurchaseDashboard: High-level overview route for procurement activities. */
export const Route = createFileRoute('/_layout/dashboard/purchase')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_layout/dashboard/purchase"!</div>
}
